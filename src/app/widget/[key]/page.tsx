import { hasServiceRole } from "@/lib/supabase/admin";
import { resolveWidgetOrg } from "@/lib/widget/resolve";
import { WidgetChat } from "@/app/widget/[key]/widget-chat";

export const dynamic = "force-dynamic";

export default async function WidgetPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  if (!hasServiceRole()) {
    return <Unavailable note="The widget isn't enabled on this deployment." />;
  }

  const org = await resolveWidgetOrg(key);
  if (!org) {
    return <Unavailable note="This help widget is unavailable or has been turned off." />;
  }

  return <WidgetChat widgetKey={key} orgName={org.name} />;
}

function Unavailable({ note }: { note: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-[#f6f9fc] px-6 text-center">
      <p className="max-w-xs text-sm text-slate-500">{note}</p>
    </div>
  );
}
