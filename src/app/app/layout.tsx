import { AppShell } from "@/components/dashboard/app-shell";

export default function TicketOSAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
