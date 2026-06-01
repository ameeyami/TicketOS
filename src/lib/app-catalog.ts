export type CatalogApp = {
  slug: string;
  name: string;
  category: AppCategory;
};

export const appCategories = [
  "All",
  "Identity",
  "HR",
  "IT",
  "Security",
  "Productivity",
  "DevOps",
  "Support",
  "Sales",
  "Finance",
] as const;

export type AppCategory = (typeof appCategories)[number];

/** Soft avatar tones per category — clean, colourful, and consistent. */
export const categoryTone: Record<string, string> = {
  Identity: "bg-[#e7f0ff] text-[#0b5f91]",
  HR: "bg-[#efeaff] text-[#5b4bc4]",
  IT: "bg-[#e6f6fb] text-[#0e7490]",
  Security: "bg-[#ffe9ec] text-[#b4334a]",
  Productivity: "bg-[#e8f8ef] text-[#0f7a5f]",
  DevOps: "bg-[#eaeafe] text-[#4f46e5]",
  Support: "bg-[#fff1e0] text-[#b4690e]",
  Sales: "bg-[#e3f7f3] text-[#0f766e]",
  Finance: "bg-[#e9f9ee] text-[#15803d]",
};

const apps: Array<[string, AppCategory]> = [
  ["Okta", "Identity"],
  ["Microsoft Entra ID", "Identity"],
  ["Google Workspace", "Identity"],
  ["OneLogin", "Identity"],
  ["JumpCloud", "Identity"],
  ["Auth0", "Identity"],
  ["BambooHR", "HR"],
  ["Workday", "HR"],
  ["Rippling", "HR"],
  ["Gusto", "HR"],
  ["Greenhouse", "HR"],
  ["Ashby", "HR"],
  ["Apple Business Manager", "IT"],
  ["Jamf", "IT"],
  ["Kandji", "IT"],
  ["Cisco Meraki", "IT"],
  ["Microsoft Intune", "IT"],
  ["Envoy", "IT"],
  ["CrowdStrike", "Security"],
  ["Cloudflare", "Security"],
  ["1Password", "Security"],
  ["SentinelOne", "Security"],
  ["Snyk", "Security"],
  ["Slack", "Productivity"],
  ["Microsoft Teams", "Productivity"],
  ["Notion", "Productivity"],
  ["Confluence", "Productivity"],
  ["Zoom", "Productivity"],
  ["Calendly", "Productivity"],
  ["Canva", "Productivity"],
  ["ClickUp", "Productivity"],
  ["GitHub", "DevOps"],
  ["GitLab", "DevOps"],
  ["Datadog", "DevOps"],
  ["Databricks", "DevOps"],
  ["PagerDuty", "DevOps"],
  ["Cursor", "DevOps"],
  ["Sentry", "DevOps"],
  ["Jira", "DevOps"],
  ["Zendesk", "Support"],
  ["Intercom", "Support"],
  ["Freshservice", "Support"],
  ["Salesforce", "Sales"],
  ["HubSpot", "Sales"],
  ["Brex", "Finance"],
  ["Ramp", "Finance"],
  ["QuickBooks", "Finance"],
  ["Stripe", "Finance"],
];

export const appCatalog: CatalogApp[] = apps
  .map(([name, category]) => ({
    name,
    category,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
