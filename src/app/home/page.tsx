import Link from "next/link";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { AppHeader } from "@/components/AppHeader";
import type { PermissionKey } from "@/lib/permissions";

type Tile = {
  nameKey: TKey;
  descKey: TKey;
  // Fixed language-independent glyph for the colored square, the visible
  // name below it is what's actually translated.
  icon: string;
  href: string;
  permission: PermissionKey;
  color: string;
};

const TILES: Tile[] = [
  {
    nameKey: "jobBoard",
    descKey: "tileJobBoardDesc",
    icon: "J",
    href: "/jobs",
    permission: "jobs.view",
    color: "bg-teal-500",
  },
  {
    nameKey: "tileNewQuote",
    descKey: "tileNewQuoteDesc",
    icon: "N",
    href: "/jobs/new",
    permission: "jobs.create",
    color: "bg-orange-500",
  },
  {
    nameKey: "tileClients",
    descKey: "tileClientsDesc",
    icon: "C",
    href: "/clients",
    permission: "clients.view",
    color: "bg-rose-500",
  },
  {
    nameKey: "tileBilling",
    descKey: "tileBillingDesc",
    icon: "B",
    href: "/billing",
    permission: "billing.view",
    color: "bg-indigo-500",
  },
  {
    nameKey: "tileCosting",
    descKey: "tileCostingDesc",
    // "$" rather than "C" - Clients already uses that letter, and the two
    // tiles sit next to each other in this grid.
    icon: "$",
    href: "/costing",
    permission: "costing.view",
    color: "bg-violet-600",
  },
  {
    nameKey: "tileMaterials",
    descKey: "tileMaterialsDesc",
    icon: "M",
    href: "/materials",
    permission: "materials.view",
    color: "bg-amber-500",
  },
  {
    nameKey: "tileUsers",
    descKey: "tileUsersDesc",
    icon: "U",
    href: "/users",
    permission: "users.manage",
    color: "bg-slate-600",
  },
];

export default async function HomePage() {
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const tiles = TILES.filter((tile) => access.can(tile.permission));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} />

      <main className="p-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tiles.map((tile) => (
            <Link
              key={tile.nameKey}
              href={tile.href}
              title={t(tile.descKey)}
              className="group flex flex-col items-center gap-2 rounded-lg p-3 text-center hover:bg-white hover:shadow-sm dark:hover:bg-slate-900"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-xl text-xl font-semibold text-white ${tile.color}`}
              >
                {tile.icon}
              </div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {t(tile.nameKey)}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
