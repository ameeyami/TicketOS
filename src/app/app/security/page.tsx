import { redirect } from "next/navigation";

// Security review folded into Policies (which already shows policy checks and
// guardrail rules, plus the high-risk actions list). This route stays as a
// redirect so existing links and bookmarks keep working.
export default function SecurityPage() {
  redirect("/app/policies");
}
