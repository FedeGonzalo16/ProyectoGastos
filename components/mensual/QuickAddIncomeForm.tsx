"use client";

import { useState, type FormEvent } from "react";
import type { Category, Income } from "@/lib/types";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { todayAsDateInput } from "@/lib/format";

interface QuickAddIncomeFormProps {
  incomeCategories: Category[];
  onSubmit: (input: Omit<Income, "id" | "user_id" | "created_at" | "updated_at">) => void;
}

/** Alta rápida de un ingreso (sueldo, extra, venta...), categorizado igual que los gastos. */
export function QuickAddIncomeForm({ incomeCategories, onSubmit }: QuickAddIncomeFormProps) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(incomeCategories[0]?.id ?? null);
  const [date, setDate] = useState(todayAsDateInput());
  const [description, setDescription] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return;

    onSubmit({ amount: numericAmount, category_id: categoryId, date, description: description || null });
    setAmount("");
    setDescription("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div className="flex gap-2.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          placeholder="Monto"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border px-2.5 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
        />
        <input
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="w-33 shrink-0 rounded-xl border px-2 py-2 text-xs outline-none"
          style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
        />
      </div>

      <input
        type="text"
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className="mt-2.5 w-full rounded-xl border px-2.5 py-2 text-sm outline-none"
        style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
      />

      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
        {incomeCategories.map((category, index) => {
          const isSelected = category.id === categoryId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
              style={
                isSelected
                  ? {
                      background: "var(--color-brand-soft)",
                      color: categoricalColorVar(index),
                      border: `1.5px solid ${categoricalColorVar(index)}`,
                    }
                  : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
              }
            >
              {category.name}
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
        style={{ background: "var(--color-brand)" }}
      >
        Agregar ingreso
      </button>
    </form>
  );
}
