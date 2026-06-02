import { redirect } from "next/navigation";

// Agent management now lives on the Autonomy page (richer controls: autonomy
// modes, trust scoring, and the audit trail). This route stays as a redirect
// so existing links and bookmarks keep working.
export default function AgentsPage() {
  redirect("/app/autonomy");
}
