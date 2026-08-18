"use client";

import { useId, useRef, useState } from "react";
import { translate, type TKey, type Locale } from "@/lib/i18n";
import { clientDisplayName } from "@/lib/client-display";

export type ClientOption = { id: string; name: string; nameTh: string | null };

const INPUT_CLASS =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-100";

function matches(query: string, client: ClientOption) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    client.name.toLowerCase().includes(q) ||
    (client.nameTh?.toLowerCase().includes(q) ?? false)
  );
}

// Single search-or-create field, replacing what used to be a plain <select>
// of existing clients plus separate always-visible "new client" inputs.
// Typing filters a live suggestion list; picking one selects that client,
// not matching anything just means the typed text becomes a new client's
// name - no separate "confirm new" step. Submits through the same
// clientId/newClientName hidden fields createJob already reads, so no
// server action changes were needed for this.
export function ClientCombobox({
  clients,
  locale,
  invalid,
  onStateChange,
}: {
  clients: ClientOption[];
  locale: Locale;
  invalid?: boolean;
  onStateChange?: () => void;
}) {
  const t = (key: TKey) => translate(locale, key);
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ClientOption | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // -1 = nothing arrow-key-highlighted yet. Deliberately NOT defaulting to
  // 0: typing "Fon" with both "Fon" and "Fondue" as clients shouldn't let
  // a bare Enter silently commit to whichever sorts first - only an
  // explicit arrow press should be able to pick a suggestion.
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = selected ? [] : clients.filter((c) => matches(query, c)).slice(0, 8);

  function selectClient(client: ClientOption) {
    setSelected(client);
    setQuery(clientDisplayName(locale, client));
    setIsOpen(false);
    onStateChange?.();
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    onStateChange?.();
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      // Only commit a suggestion if the user actually navigated to one -
      // otherwise just close the dropdown and leave the typed text as-is.
      e.preventDefault();
      if (highlighted >= 0) selectClient(suggestions[highlighted]);
      else setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showNewClientFields = !selected && query.trim() !== "";

  return (
    <div>
      <label className="block text-xs text-slate-500 dark:text-slate-400">
        {t("client")}
        <div className="relative">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlighted(0);
              onStateChange?.();
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t("clientSearchPlaceholder")}
            className={
              INPUT_CLASS + " " + (invalid ? "border-red-500 dark:border-red-500" : "border-slate-300 dark:border-slate-700")
            }
          />
          {selected && (
            <button
              type="button"
              onClick={clearSelection}
              aria-label={t("clearSelectionLabel")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              &times;
            </button>
          )}
          {isOpen && suggestions.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              {suggestions.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === highlighted}>
                  <button
                    type="button"
                    // Fires before the input's onBlur would close the
                    // dropdown, otherwise this click never registers.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectClient(c)}
                    className={
                      "block w-full px-3 py-1.5 text-left text-sm " +
                      (i === highlighted
                        ? "bg-slate-100 dark:bg-slate-700"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/60")
                    }
                  >
                    {clientDisplayName(locale, c)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </label>

      {showNewClientFields && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">{t("newClientNoMatchHint")}</p>
          <input type="hidden" name="newClientName" value={query} />
          <label className="block text-xs text-slate-500 dark:text-slate-400">
            {t("newClientNameTh")}
            <input
              name="newClientNameTh"
              placeholder={t("newClientNameThPlaceholder")}
              className={INPUT_CLASS + " border-slate-300 dark:border-slate-700"}
            />
          </label>
          <div>
            <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
              {t("newClientDetailsOptionalHint")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("clientFieldAddress")}
                <textarea
                  name="newClientAddress"
                  rows={2}
                  className={INPUT_CLASS + " border-slate-300 dark:border-slate-700"}
                />
              </label>
              <div className="grid grid-cols-1 gap-3">
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("clientFieldTaxId")}
                  <input
                    name="newClientTaxId"
                    className={INPUT_CLASS + " border-slate-300 dark:border-slate-700"}
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("clientFieldContact")}
                  <input
                    name="newClientContactInfo"
                    className={INPUT_CLASS + " border-slate-300 dark:border-slate-700"}
                  />
                </label>
              </div>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("clientFieldCreditTerms")}
                <input
                  type="number"
                  name="newClientCreditTermDays"
                  min={0}
                  className={INPUT_CLASS + " border-slate-300 dark:border-slate-700"}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <input type="hidden" name="clientId" value={selected?.id ?? ""} />
    </div>
  );
}
