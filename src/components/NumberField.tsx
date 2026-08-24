"use client";

import { useEffect, useState } from "react";

interface NumberFieldProps {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  fallback?: number;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

/**
 * Numeric input that allows empty / intermediate strings while focused,
 * then clamps and commits on blur (fixes "can't delete first digit").
 */
export function NumberField({
  value,
  onCommit,
  min = 5,
  max = 600,
  fallback = 20,
  className,
  id,
  "aria-label": ariaLabel,
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === ".") {
      onCommit(Math.max(min, Math.min(max, fallback)));
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      onCommit(Math.max(min, Math.min(max, fallback)));
      return;
    }
    onCommit(Math.max(min, Math.min(max, Math.round(n))));
  }

  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      value={focused ? draft : String(value)}
      onFocus={() => {
        setFocused(true);
        setDraft(String(value));
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "" || /^\d*$/.test(next)) setDraft(next);
      }}
      onBlur={() => {
        setFocused(false);
        commit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}
