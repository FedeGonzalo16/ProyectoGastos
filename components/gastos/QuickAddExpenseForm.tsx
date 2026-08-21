"use client";

import { useState, type FormEvent } from "react";
import type { Category, Expense, PaymentMethod } from "@/lib/types";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { todayAsDateInput } from "@/lib/format";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transf." },
];

interface QuickAddExpenseFormProps {
  expenseCategories: Category[];
  onSubmit: (input: Omit<Expense, "id" | "user_id" | "created_at" | "updated_at">) => void;
}

/**
 * Formulario de alta rápida de un gasto diario. Su única responsabilidad es
 * juntar los datos y avisar al padre (`onSubmit`) — no sabe nada de cómo se
 * guardan ni de Supabase.
 */
export function QuickAddExpenseForm({ expenseCategories, onSubmit }: QuickAddExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(expenseCategories[0]?.id ?? null);
  const [date, setDate] = useState(todayAsDateInput());
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("debito");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return;

    onSubmit({
      amount: numericAmount,
      category_id: categoryId,
      date,
      description: description || null,
      payment_method: paymentMethod,
      is_fixed: false,
      fixed_expense_id: null,
    });

    // Limpia solo lo que tiene sentido limpiar entre gastos consecutivos.
    setAmount("");
    setDescription("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-5"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-baseline justify-center gap-1.5 py-1">
        <span className="font-heading text-2xl font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          $
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          placeholder="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="font-heading w-40 text-center text-4xl font-semibold outline-none"
          style={{ background: "transparent", color: "var(--color-text)" }}
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {expenseCategories.map((category, index) => {
          const isSelected = category.id === categoryId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold"
              style={
                isSelected
                  ? {
                      background: "var(--color-brand-soft)",
                      color: categoricalColorVar(index),
                      border: `1.5px solid ${categoricalColorVar(index)}`,
                    }
                  : {
                      color: "var(--color-text-secondary)",
                      border: "1px solid var(--color-border)",
                    }
              }
            >
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 flex gap-2.5">
        <label className="flex-1 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--color-border)" }}>
          <span className="block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
            Fecha
          </span>
          <input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full text-sm outline-none"
            style={{ background: "transparent", color: "var(--color-text)" }}
          />
        </label>

        <label className="flex-[1.4] rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--color-border)" }}>
          <span className="block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
            Descripción
          </span>
          <input
            type="text"
            placeholder="Supermercado"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full text-sm outline-none"
            style={{ background: "transparent", color: "var(--color-text)" }}
          />
        </label>
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
          Medio de pago
        </span>
        <div className="flex gap-1.5">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = method.value === paymentMethod;
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className="flex-1 rounded-lg py-2 text-[11.5px]"
                style={
                  isSelected
                    ? { background: "var(--color-brand-soft)", color: "var(--color-brand)", fontWeight: 600 }
                    : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                }
              >
                {method.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white"
        style={{ background: "var(--color-brand)" }}
      >
        Guardar gasto
      </button>
    </form>
  );
}
