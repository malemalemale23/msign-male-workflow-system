"use client";

import { useState } from "react";
import Link from "next/link";
import { markNotificationRead } from "@/app/actions/notifications";
import { translate, type Locale, type TKey } from "@/lib/i18n";

export type NotificationItem = {
  id: string;
  jobId: string;
  jobCode: string;
  stageLabel: string;
  read: boolean;
  createdAt: Date;
};

export function NotificationBell({
  notifications,
  locale,
}: {
  notifications: NotificationItem[];
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const t = (key: TKey, vars?: Record<string, string>) => translate(locale, key, vars);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notificationsTitle")}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        &#128276;
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {t("notificationsTitle")}
            </p>
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                {t("notificationsEmpty")}
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800">
                    <Link
                      href={`/jobs/${n.jobId}`}
                      onClick={() => {
                        if (!n.read) markNotificationRead(n.id).catch(() => {});
                        setOpen(false);
                      }}
                      className={
                        "block px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 " +
                        (n.read
                          ? "text-slate-400 dark:text-slate-500"
                          : "font-medium text-slate-700 dark:text-slate-200")
                      }
                    >
                      {t("notificationJobReachedStage", { jobCode: n.jobCode, stage: n.stageLabel })}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
