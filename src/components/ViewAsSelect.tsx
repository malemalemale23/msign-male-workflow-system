"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewAs } from "@/app/actions/view-as";
import { roleDisplayName } from "@/lib/role-display";
import type { Locale } from "@/lib/i18n";

export function ViewAsSelect({
  roles,
  currentRoleId,
  label,
  locale,
}: {
  roles: { id: string; name: string; nameTh: string | null }[];
  currentRoleId: string;
  label: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const roleId = e.target.value;
    startTransition(async () => {
      await setViewAs(roleId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="font-medium text-slate-500 dark:text-slate-400">
        {label}:
      </span>
      <select
        value={currentRoleId}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {roleDisplayName(locale, role)}
          </option>
        ))}
      </select>
    </div>
  );
}
