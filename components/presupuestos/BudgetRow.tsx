"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";

interface BudgetRowProps {
  category: Category;
  colorIndex: number;
  /** Monto actual del presupuesto, o `null` si la categoría no tiene uno. */
  monthlyAmount: number | null;
  /** `amount === null` significa "se borró el presupuesto" (el input quedó vacío). */
  onSave: (amount: number | null) => void;
}

/**
 * Una fila por categoría: nombre + un input de monto que se guarda solo al
 * salir del campo (no hace falta un botón "Guardar" aparte por cada una).
 */
export function BudgetRow({ category, colorIndex, monthlyAmount, onSave }: BudgetRowProps) {
  const [input, setInput] = useState(monthlyAmount !== null ? String(monthlyAmount) : "");

  function handleBlur() {
    const trimmed = input.trim();
    if (trimmed === "") {
      if (monthlyAmount !== null) onSave(null);
      return;
    }
    const value = Number(trimmed);
    if (value > 0) onSave(value);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoricalColorVar(colorIndex) }} />
      <span className="flex-1 text-sm">{category.name}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        placeholder="Sin tope"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onBlur={handleBlur}
        className="w-28 rounded-lg border px-2.5 py-1.5 text-right text-sm outline-none"
        style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
      />
    </div>
  );
}
