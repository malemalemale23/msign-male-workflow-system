"use client";

import { useState } from "react";
import { translate, LOCALES, type Locale } from "@/lib/i18n";

// error.tsx must be a client component (Next.js requirement for error
// boundaries), so it can't call the server-only getLocale() the rest of the
// app uses - reads the same "locale" cookie directly instead. translate()
// itself is already pure/client-safe by design, see src/lib/i18n.ts.
function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )locale=([^;]+)/);
  const raw = match ? decodeURIComponent(match[1]) : null;
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : "en";
}

export default function ErrorBoundary({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  // Next.js 16.2+ prop, added after this app's training-data cutoff for
  // Next.js itself (see AGENTS.md) - re-fetches and re-renders the segment,
  // preferred over the older reset() (which only clears error state without
  // re-fetching) per the bundled docs at node_modules/next/dist/docs.
  unstable_retry: () => void;
}) {
  const [locale] = useState(readLocaleCookie);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {t("errorPageTitle")}
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t("errorPageDesc")}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t("tryAgainButton")}
        </button>
        {/* Plain <a>, not next/link: if the tree that just crashed is still
            mounted somewhere in the client router, a hard navigation is the
            more reliable escape hatch than a client-side transition through
            the same app that just errored. */}
        <a
          href="/home"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          {t("backToHomeButton")}
        </a>
      </div>
    </div>
  );
}
