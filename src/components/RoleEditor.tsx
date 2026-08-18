"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRole, deleteRole } from "@/app/actions/roles";
import { PERMISSIONS, PERMISSION_CATEGORIES, CATEGORY_LABEL_KEY } from "@/lib/permissions";
import { translate, type Locale } from "@/lib/i18n";
import { roleDisplayName } from "@/lib/role-display";

type RoleSummary = { id: string; name: string; nameTh: string | null; color: string };
type RoleDetail = RoleSummary & {
  isSystem: boolean;
  memberCount: number;
  enabledKeys: string[];
};

function PermissionToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
        (enabled ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700")
      }
    >
      <span
        className={
          "inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform " +
          (enabled ? "translate-x-[22px]" : "translate-x-1")
        }
      />
    </button>
  );
}

export function RoleEditor({
  roles,
  selected,
  locale,
}: {
  roles: RoleSummary[];
  selected: RoleDetail;
  locale: Locale;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string>) =>
    translate(locale, key, vars);
  const unsavedMessage = t("unsavedLeaveConfirm");

  // A different role loaded from the server (switched via dropdown, or after
  // a save's router.refresh()) needs to reset this draft to the new
  // baseline. Rather than syncing via an effect, the parent remounts this
  // component with key={selected.id}, so these initializers simply re-run.
  const [name, setName] = useState(selected.name);
  const [nameTh, setNameTh] = useState(selected.nameTh ?? "");
  const [color, setColor] = useState(selected.color);
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(
    new Set(selected.enabledKeys)
  );

  // saveRole throws on an empty name - these inputs aren't inside a <form>
  // (Save lives in the fixed unsaved-changes bar, not a submit button), so
  // HTML5 required validation never runs. Guard it here instead of letting
  // that throw surface out of the async transition.
  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  const isDirty =
    name !== selected.name ||
    nameTh !== (selected.nameTh ?? "") ||
    color !== selected.color ||
    enabledKeys.size !== selected.enabledKeys.length ||
    selected.enabledKeys.some((k) => !enabledKeys.has(k));

  // Browser-level nav: tab close, refresh, typing a new URL, back/forward.
  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // In-app nav: any link/button outside this editor (AppHeader's Back, Sign
  // out, Settings, language/view-as controls). Clicks inside the editor
  // itself (toggles, Save/Reset, name/color fields) are exempt.
  useEffect(() => {
    if (!isDirty) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (rootRef.current?.contains(target)) return;
      const control = target.closest("a, button");
      if (!control) return;
      if (!window.confirm(unsavedMessage)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty, unsavedMessage]);

  function togglePermission(key: string) {
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleReset() {
    setName(selected.name);
    setNameTh(selected.nameTh ?? "");
    setColor(selected.color);
    setEnabledKeys(new Set(selected.enabledKeys));
  }

  function handleSave() {
    if (!canSave) return;
    startTransition(async () => {
      await saveRole(selected.id, {
        name: trimmedName,
        nameTh,
        color,
        permissionKeys: Array.from(enabledKeys),
      });
      router.refresh();
    });
  }

  function handleSwitchRole(newRoleId: string) {
    if (newRoleId === selected.id) return;
    if (isDirty && !window.confirm(unsavedMessage)) return;
    // scroll: false, switching roles is for quick batch review/edits, it
    // shouldn't yank the page back to the top each time.
    router.push(`/settings/roles?role=${newRoleId}`, { scroll: false });
  }

  const canDelete = !selected.isSystem && selected.memberCount === 0;

  return (
    <div ref={rootRef} className="flex gap-6">
      <aside className="w-48 shrink-0 space-y-0.5">
        {roles.map((r) => {
          const isSelected = r.id === selected.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSwitchRole(r.id)}
              className={
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium " +
                (isSelected
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")
              }
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: isSelected ? color : r.color }}
              />
              <span className="truncate">
                {isSelected ? roleDisplayName(locale, { name, nameTh }) : roleDisplayName(locale, r)}
              </span>
            </button>
          );
        })}
      </aside>

      <div className="min-w-0 flex-1">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-md border border-slate-200 p-0.5 dark:border-slate-700"
                title="Role color"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("roleNameEnPlaceholder")}
                className="w-36 rounded-md border border-transparent px-1.5 py-0.5 text-base font-semibold text-slate-900 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:text-slate-100 dark:hover:border-slate-700"
              />
              <input
                value={nameTh}
                onChange={(e) => setNameTh(e.target.value)}
                placeholder={t("roleNameThPlaceholder")}
                className="w-36 rounded-md border border-transparent px-1.5 py-0.5 text-base font-semibold text-slate-900 hover:border-slate-200 focus:border-slate-300 focus:outline-none dark:text-slate-100 dark:hover:border-slate-700"
              />
            </div>

            {canDelete && (
              <form action={deleteRole.bind(null, selected.id)}>
                <button
                  type="submit"
                  onClick={(e) => {
                    if (!window.confirm(t("deleteRoleConfirm", { role: selected.name }))) {
                      e.preventDefault();
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                >
                  {t("deleteRoleButton")}
                </button>
              </form>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {PERMISSION_CATEGORIES.map((category) => (
              <div key={category} className="px-6 py-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {t(CATEGORY_LABEL_KEY[category])}
                </p>
                <div className="space-y-1">
                  {PERMISSIONS.filter((p) => p.category === category).map((perm) => {
                    const enabled = enabledKeys.has(perm.key);
                    return (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between gap-6 rounded-lg px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {t(perm.labelKey)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {t(perm.descKey)}
                          </p>
                        </div>
                        <PermissionToggle
                          enabled={enabled}
                          onToggle={() => togglePermission(perm.key)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
          <div className="flex w-full max-w-2xl items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {canSave ? t("unsavedChangesWarning") : t("roleNameRequiredWarning")}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={isPending}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {t("resetButton")}
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !canSave}
                className="rounded-md bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                {isPending ? t("savingButton") : t("saveChangesButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
