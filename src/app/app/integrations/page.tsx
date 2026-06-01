import { redirect } from "next/navigation";

// The connectable-app catalog now lives at /app/apps (sidebar: IT → Applications).
// This route is kept as a redirect so old links and the integration detail
// back-links land on the single, consolidated catalog.
export default function IntegrationsPage() {
  redirect("/app/apps");
}
