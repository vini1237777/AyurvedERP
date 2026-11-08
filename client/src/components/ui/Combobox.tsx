import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import { createPortal } from "react-dom";

// Search box with a results list that works fully from the keyboard.
// Focus stays in the input and aria-activedescendant points at the highlighted
// option, so typing never gets interrupted. The list is portalled to <body>
// because billing rows sit inside a horizontally scrolling table.

interface ComboboxProps<T> {
  value: string;
  onInputChange: (text: string) => void;
  // "tab" means the browser is about to move focus itself, so callers should
  // only move focus for "enter" and "mouse".
  onSelect: (option: T, via: "enter" | "tab" | "mouse") => void;
  // Enter pressed while no list is showing.
  onEnter?: () => void;
  openOnFocus?: boolean;
  options: T[];
  getKey: (option: T) => string | number;
  renderOption: (option: T, active: boolean) => ReactNode;
  placeholder?: string;
  label?: string; // used as aria-label when there is no visible <label>
  id?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  emptyText?: string;
  minListWidth?: number;
  invalid?: boolean;
}

export function Combobox<T>({
  value,
  onInputChange,
  onSelect,
  onEnter,
  openOnFocus = true,
  options,
  getKey,
  renderOption,
  placeholder,
  label,
  id,
  className = "",
  inputRef,
  emptyText = "No matches",
  minListWidth = 320,
  invalid,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  // Tab only picks a result if the person typed since focusing. Tabbing through
  // a filled field must never swap its value.
  const typedRef = useRef(false);
  const localRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-option-${i}`;

  const showList = open;
  const active = options.length
    ? Math.min(activeIndex, options.length - 1)
    : -1;

  useLayoutEffect(() => {
    if (!showList) return;
    function place() {
      const el = localRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const flip = below < 160 && above > below;
      const maxHeight = Math.min(280, flip ? above : below);
      const width = Math.max(r.width, minListWidth);
      setPos({
        top: flip ? r.top - maxHeight - 4 : r.bottom + 4,
        left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
        width,
        maxHeight,
      });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [showList, minListWidth]);

  useEffect(() => {
    if (!showList || active < 0) return;
    document
      .getElementById(optionId(active))
      ?.scrollIntoView({ block: "nearest" });
    // optionId only depends on baseId, which never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, showList]);

  function pick(option: T, via: "enter" | "tab" | "mouse") {
    typedRef.current = false;
    setOpen(false);
    onSelect(option, via);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!showList) {
          setOpen(true);
          return;
        }
        if (!options.length) return;
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((active + step + options.length) % options.length);
        return;
      }
      case "Enter":
        if (showList && active >= 0) {
          e.preventDefault();
          e.stopPropagation();
          pick(options[active], "enter");
        } else if (!showList && onEnter) {
          e.preventDefault();
          onEnter();
        }
        return;
      case "Escape":
        if (showList) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
        return;
      case "Tab":
        if (showList && typedRef.current && value.trim() && active >= 0) {
          pick(options[active], "tab");
        } else {
          setOpen(false);
        }
        return;
    }
  }

  return (
    <>
      <input
        ref={(el) => {
          localRef.current = el;
          if (typeof inputRef === "function") inputRef(el);
          else if (inputRef)
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current =
              el;
        }}
        id={id}
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 ? optionId(active) : undefined
        }
        aria-invalid={invalid ? true : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          typedRef.current = true;
          setActiveIndex(0);
          setOpen(true);
          onInputChange(e.target.value);
        }}
        onFocus={(e) => {
          typedRef.current = false;
          setActiveIndex(0);
          if (openOnFocus) setOpen(true);
          e.target.select();
        }}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
            className="z-[100] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            {options.length === 0 ? (
              <div className="px-4 py-4 text-center text-xs text-slate-500">
                {emptyText}
              </div>
            ) : (
              options.map((option, i) => (
                <div
                  key={getKey(option)}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  // Keep focus in the input so the click isn't lost to blur.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(option, "mouse");
                  }}
                  onMouseMove={() => {
                    if (i !== activeIndex) setActiveIndex(i);
                  }}
                  className={`cursor-pointer border-b border-slate-50 last:border-0 ${
                    i === active ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  {renderOption(option, i === active)}
                </div>
              ))
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
