"use client";

import { useState } from "react";

interface SingleBudgetFieldProps {
  label: string;
  description: string;
  /** Prefijo del input (ej. "$" o "US$"). */
  prefix: string;
  value: number | null;
  onSave: (amount: number | null) => void;
}

/**
 * Un solo monto editable con guardado al salir del campo — mismo patrón que
 * `BudgetRow`, pero para un valor "suelto" (no atado a una categoría), como
 * el tope total de gastos o el mínimo de inversión del mes.
 */
export function SingleBudgetField({ label, description, prefix, value, onSave }: SingleBudgetFieldProps) {
  const [input, setInput] = useState(value !== null ? String(value) : "");

  function handleBlur() {
    const trimmed = input.trim();
    if (trimmed === "") {
      if (value !== null) onSave(null);
      return;
    }
    const parsed = Number(trimmed);
    if (parsed > 0) onSave(parsed);
  }

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        {description}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          {prefix}
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="Sin definir"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onBlur={handleBlur}
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
        />
      </div>
    </section>
  );
}
