"use client";

import { useId, useRef, useState } from "react";
import { translate, type TKey, type Locale } from "@/lib/i18n";
import { PRODUCT_TYPE_LABEL_KEY } from "@/lib/product-types";

const OPTIONS = Object.entries(PRODUCT_TYPE_LABEL_KEY) as [string, TKey][];

// Fixed 8-value enum, unlike ClientCombobox there's no "create new" case -
// typing only filters/searches, the committed value only ever changes on
// an explicit pick (click, or arrow-to-highlight then Enter), never from
// typed text alone. Same "don't auto-pick on bare Enter" reasoning as the
// client picker: nothing is highlighted until an arrow key is pressed.
export function ProductTypeCombobox({ locale }: { locale: Locale }) {
  const t = (key: TKey) => translate(locale, key);
  const listboxId = useId();
  const [selectedKey, setSelectedKey] = useState(OPTIONS[0][0]);
  const [query, setQuery] = useState(t(OPTIONS[0][1]));
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = OPTIONS.filter(([, labelKey]) =>
    t(labelKey).toLowerCase().includes(query.trim().toLowerCase())
  );

  function select(key: string, labelKey: TKey) {
    setSelectedKey(key);
    setQuery(t(labelKey));
    setIsOpen(false);
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
      e.preventDefault();
      if (highlighted >= 0) {
        const [key, labelKey] = suggestions[highlighted];
        select(key, labelKey);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  function handleBlur() {
    // Typed text that was never confirmed with a pick doesn't correspond
    // to a real product type - snap the visible text back to whatever's
    // actually still committed rather than leaving a mismatch on screen.
    const current = OPTIONS.find(([key]) => key === selectedKey)!;
    setQuery(t(current[1]));
    setIsOpen(false);
  }

  return (
    <label className="text-xs text-slate-500 dark:text-slate-400">
      {t("productTypeLabel")}
      <div className="relative">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlighted(-1);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        {isOpen && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {suggestions.map(([key, labelKey], i) => (
              <li key={key} role="option" aria-selected={i === highlighted}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(key, labelKey)}
                  className={
                    "block w-full px-3 py-1.5 text-left text-sm " +
                    (i === highlighted
                      ? "bg-slate-100 dark:bg-slate-700"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/60")
                  }
                >
                  {t(labelKey)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input type="hidden" name="productType" value={selectedKey} />
    </label>
  );
}
