/**
 * SLA is derived (not stored): each priority has a response-time target, and
 * the clock starts at ticket creation. One source of truth for the whole app.
 */

export const SLA_TARGET_HOURS: Record<string, number> = {
  critical: 2,
  high: 8,
  medium: 24,
  low: 72,
};

export type SlaState = "met" | "breached" | "at_risk" | "on_track";

export type Sla = {
  targetHours: number;
  dueAt: Date;
  remainingMinutes: number;
  state: SlaState;
  label: string;
  badgeClass: string;
};

const TONE: Record<SlaState, string> = {
  met: "border-emerald-200 bg-emerald-50 text-emerald-700",
  on_track: "border-sky-200 bg-sky-50 text-sky-700",
  at_risk: "border-amber-200 bg-amber-50 text-amber-800",
  breached: "border-rose-200 bg-rose-50 text-rose-700",
};

export function slaTargetHours(priority: string): number {
  return SLA_TARGET_HOURS[priority] ?? 24;
}

/** Compact priority -> target label, e.g. "2h", "24h", "3d". */
export function formatSlaTarget(priority: string): string {
  const hours = slaTargetHours(priority);
  return hours >= 24 && hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`;
}

export function formatSlaDuration(totalMinutes: number): string {
  const minutes = Math.abs(Math.round(totalMinutes));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rem = minutes % 60;
    return rem ? `${hours}h ${rem}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

export function computeSla(input: {
  priority: string;
  createdAt: string | null | undefined;
  status?: string | null;
  resolvedAt?: string | null;
  now?: number;
}): Sla {
  const now = input.now ?? Date.now();
  const targetHours = slaTargetHours(input.priority);
  const createdMs = input.createdAt ? new Date(input.createdAt).getTime() : now;
  const dueMs = createdMs + targetHours * 3_600_000;
  const dueAt = new Date(dueMs);

  if (input.status === "resolved") {
    const resolvedMs = input.resolvedAt ? new Date(input.resolvedAt).getTime() : now;
    const met = resolvedMs <= dueMs;
    return {
      targetHours,
      dueAt,
      remainingMinutes: Math.round((dueMs - resolvedMs) / 60000),
      state: met ? "met" : "breached",
      label: met ? "Met" : "Resolved late",
      badgeClass: met ? TONE.met : TONE.breached,
    };
  }

  const remainingMinutes = Math.round((dueMs - now) / 60000);
  if (remainingMinutes <= 0) {
    return {
      targetHours,
      dueAt,
      remainingMinutes,
      state: "breached",
      label: `Breached · ${formatSlaDuration(remainingMinutes)} over`,
      badgeClass: TONE.breached,
    };
  }

  const atRisk = remainingMinutes <= targetHours * 60 * 0.25;
  return {
    targetHours,
    dueAt,
    remainingMinutes,
    state: atRisk ? "at_risk" : "on_track",
    label: `${formatSlaDuration(remainingMinutes)} left`,
    badgeClass: atRisk ? TONE.at_risk : TONE.on_track,
  };
}
