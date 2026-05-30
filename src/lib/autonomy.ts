/**
 * Earned, per-workflow autonomy.
 *
 * A workflow's autonomy level decides how much it can do without a human in the
 * loop. The level is *earned*: TicketOS scores each workflow's track record
 * (success rate + rollback rate, weighted by how many runs it has) and
 * recommends a level — promoting proven workflows and tightening ones that fail
 * or get rolled back. Promotions are one-click; a drop in trust recommends an
 * immediate tighten.
 */

import type { PlannedAction } from "@/lib/workflow-action-plan";

export type AutonomyLevel = "suggest" | "approve_each" | "auto_with_audit" | "full_auto";

export const AUTONOMY_LEVELS: AutonomyLevel[] = ["suggest", "approve_each", "auto_with_audit", "full_auto"];

export const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = "approve_each";

export const autonomyLevelMeta: Record<AutonomyLevel, { label: string; rank: number; detail: string }> = {
  suggest: {
    label: "Suggest only",
    rank: 0,
    detail: "TicketOS drafts the plan; a human starts every action.",
  },
  approve_each: {
    label: "Approve each",
    rank: 1,
    detail: "The agent prepares execution, but every action pauses for approval.",
  },
  auto_with_audit: {
    label: "Auto with audit",
    rank: 2,
    detail: "Low and medium-risk actions run automatically and are logged; high-risk still needs approval.",
  },
  full_auto: {
    label: "Full auto",
    rank: 3,
    detail: "The agent runs the whole workflow autonomously, fully audited.",
  },
};

export function normalizeAutonomyLevel(value: unknown): AutonomyLevel {
  return typeof value === "string" && (AUTONOMY_LEVELS as string[]).includes(value)
    ? (value as AutonomyLevel)
    : DEFAULT_AUTONOMY_LEVEL;
}

export type WorkflowTrack = {
  totalRuns: number;
  completedRuns: number;
  successfulRuns: number;
  failedRuns: number;
  rollbacks: number;
};

export type TrustAssessment = {
  score: number;
  successRate: number;
  rollbackRate: number;
  sampleSize: number;
  recommended: AutonomyLevel;
  rationale: string;
};

export function assessTrust(track: WorkflowTrack): TrustAssessment {
  const completed = track.completedRuns;
  const successRate = completed ? Math.round((track.successfulRuns / completed) * 100) : 0;
  const rollbackRate = completed ? Math.round((track.rollbacks / completed) * 100) : 0;

  // Confidence grows with evidence and saturates around six completed runs.
  const maturity = Math.min(1, completed / 6);
  // Reward success, penalise rollbacks harder, then scale by how much we've seen.
  const raw = successRate - rollbackRate * 1.5;
  const score = Math.max(0, Math.min(100, Math.round(raw * maturity)));

  let recommended: AutonomyLevel;
  if (completed === 0) {
    recommended = "approve_each";
  } else if (score >= 85 && rollbackRate === 0 && completed >= 5) {
    recommended = "full_auto";
  } else if (score >= 70 && rollbackRate <= 10 && completed >= 3) {
    recommended = "auto_with_audit";
  } else if (score >= 40) {
    recommended = "approve_each";
  } else {
    recommended = "suggest";
  }

  const rationale =
    completed === 0
      ? "No completed runs yet — start with approval on every action."
      : `${successRate}% success over ${completed} run${completed === 1 ? "" : "s"}, ${rollbackRate}% rolled back.`;

  return { score, successRate, rollbackRate, sampleSize: completed, recommended, rationale };
}

export function compareLevels(a: AutonomyLevel, b: AutonomyLevel): number {
  return autonomyLevelMeta[a].rank - autonomyLevelMeta[b].rank;
}

/** How a run should behave under a given autonomy level, applied to its action plan. */
export type ExecutionDecision = {
  runStatus: "queued" | "running" | "waiting_for_approval";
  ticketStatus: "executing" | "approval_required";
  createApproval: boolean;
  /** Actions that must wait for approval; the rest run on their planned status. */
  gatedActionKeys: string[];
  summary: string;
};

export function planExecution(level: AutonomyLevel, plan: PlannedAction[]): ExecutionDecision {
  const gated = plan.filter((action) => action.risk_level === "high" || action.requires_approval);

  switch (level) {
    case "full_auto":
      return {
        runStatus: "running",
        ticketStatus: "executing",
        createApproval: false,
        gatedActionKeys: [],
        summary: "ran every action autonomously",
      };
    case "auto_with_audit":
      if (gated.length === 0) {
        return {
          runStatus: "running",
          ticketStatus: "executing",
          createApproval: false,
          gatedActionKeys: [],
          summary: "auto-ran all actions; none were high-risk",
        };
      }
      return {
        runStatus: "waiting_for_approval",
        ticketStatus: "approval_required",
        createApproval: true,
        gatedActionKeys: gated.map((action) => action.action_key),
        summary: `auto-ran low/medium-risk actions; ${gated.length} high-risk action${
          gated.length === 1 ? "" : "s"
        } paused for approval`,
      };
    case "suggest":
      return {
        runStatus: "queued",
        ticketStatus: "approval_required",
        createApproval: true,
        gatedActionKeys: plan.map((action) => action.action_key),
        summary: "drafted a plan for a human to start",
      };
    case "approve_each":
    default:
      return {
        runStatus: "waiting_for_approval",
        ticketStatus: "approval_required",
        createApproval: true,
        gatedActionKeys: plan.map((action) => action.action_key),
        summary: "paused every action for approval",
      };
  }
}
