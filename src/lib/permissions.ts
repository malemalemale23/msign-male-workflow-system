import type { TKey } from "@/lib/i18n";

// The set of permission keys the app understands is fixed in code, because
// the code has to know what each one gates. Which roles HAVE which key is
// entirely data (RolePermission rows), toggleable from /settings/roles.
// label/description are i18n keys, not literal text, so the settings page
// renders bilingually.

export const PERMISSIONS = [
  {
    key: "jobs.view",
    labelKey: "permJobsViewLabel",
    descKey: "permJobsViewDesc",
    category: "Jobs",
  },
  {
    key: "jobs.view_price",
    labelKey: "permJobsViewPriceLabel",
    descKey: "permJobsViewPriceDesc",
    category: "Jobs",
  },
  {
    key: "jobs.view_cost",
    labelKey: "permJobsViewCostLabel",
    descKey: "permJobsViewCostDesc",
    category: "Jobs",
  },
  {
    key: "jobs.view_production",
    labelKey: "permJobsViewProductionLabel",
    descKey: "permJobsViewProductionDesc",
    category: "Jobs",
  },
  {
    key: "jobs.create",
    labelKey: "permJobsCreateLabel",
    descKey: "permJobsCreateDesc",
    category: "Jobs",
  },
  {
    key: "jobs.edit_production",
    labelKey: "permJobsEditProductionLabel",
    descKey: "permJobsEditProductionDesc",
    category: "Jobs",
  },
  {
    key: "jobs.edit_logistics",
    labelKey: "permJobsEditLogisticsLabel",
    descKey: "permJobsEditLogisticsDesc",
    category: "Jobs",
  },
  {
    key: "clients.view",
    labelKey: "permClientsViewLabel",
    descKey: "permClientsViewDesc",
    category: "Clients",
  },
  {
    key: "clients.edit",
    labelKey: "permClientsEditLabel",
    descKey: "permClientsEditDesc",
    category: "Clients",
  },
  {
    key: "billing.view",
    labelKey: "permBillingViewLabel",
    descKey: "permBillingViewDesc",
    category: "Billing",
  },
  {
    key: "costing.view",
    labelKey: "permCostingViewLabel",
    descKey: "permCostingViewDesc",
    category: "Reports",
  },
  {
    key: "materials.view",
    labelKey: "permMaterialsViewLabel",
    descKey: "permMaterialsViewDesc",
    category: "Materials",
  },
  {
    key: "materials.edit",
    labelKey: "permMaterialsEditLabel",
    descKey: "permMaterialsEditDesc",
    category: "Materials",
  },
  {
    key: "users.manage",
    labelKey: "permUsersManageLabel",
    descKey: "permUsersManageDesc",
    category: "Admin",
  },
  {
    key: "settings.manage",
    labelKey: "permSettingsManageLabel",
    descKey: "permSettingsManageDesc",
    category: "Admin",
  },
] as const satisfies ReadonlyArray<{
  key: string;
  labelKey: TKey;
  descKey: TKey;
  category: string;
}>;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_CATEGORIES = Array.from(
  new Set(PERMISSIONS.map((p) => p.category))
);

export const CATEGORY_LABEL_KEY: Record<string, TKey> = {
  Jobs: "catJobs",
  Clients: "catClients",
  Billing: "catBilling",
  Reports: "catReports",
  Materials: "catMaterials",
  Admin: "catAdmin",
};

export const DEFAULT_ROLE_PERMISSIONS: Record<
  "Admin" | "Sales" | "Floor",
  PermissionKey[]
> = {
  Admin: PERMISSIONS.map((p) => p.key),
  Sales: [
    "jobs.view",
    "jobs.view_price",
    "jobs.edit_logistics",
    "clients.view",
    "clients.edit",
    "billing.view",
  ],
  Floor: ["jobs.view", "jobs.view_production", "jobs.edit_production"],
};

export const ROLE_COLORS: Record<string, string> = {
  Admin: "#0f172a",
  Sales: "#2563eb",
  Floor: "#16a34a",
};

export const ROLE_NAME_TH: Record<string, string> = {
  Admin: "แอดมิน",
  Sales: "ฝ่ายขาย",
  Floor: "ฝ่ายผลิต",
};
