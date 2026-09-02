"use client";

import { useState, type FormEvent } from "react";
import type { Category, Income } from "@/lib/types";
import { todayAsDateInput } from "@/lib/format";
import { CategoryChipPicker } from "@/components/shared/CategoryChipPicker";
import { CheckIcon, XIcon } from "@/components/shared/icons";

interface QuickAddIncomeFormProps {
  /** Todas (activas e inactivas) — el picker filtra las inactivas por su cuenta. */
  incomeCategories: Category[];
  onSubmit: (input: Omit<Income, "id" | "user_id" | "created_at" | "updated_at">) => void;
  onCreateCategory: (name: string) => Category;
  /** Si viene un ingreso, el formulario lo edita en vez de crear uno nuevo. */
  editingIncome: Income | null;
  onCancelEdit: () => void;
}

/** Alta rápida (o edición) de un ingreso (sueldo, extra, venta...), categorizado igual que los gastos. */
export function QuickAddIncomeForm({
  incomeCategories,
  onSubmit,
  onCreateCategory,
  editingIncome,
  onCancelEdit,
}: QuickAddIncomeFormProps) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(
    incomeCategories.find((category) => category.active)?.id ?? null
  );
  const [date, setDate] = useState(todayAsDateInput());
  const [description, setDescription] = useState("");

  // Mismo patrón de sincronización que el resto de los formularios de la
  // app: al cambiar qué ingreso se edita (o pasar a "crear nuevo").
  const [syncedIncomeId, setSyncedIncomeId] = useState<string | null>(null);
  const currentIncomeId = editingIncome?.id ?? null;

  if (currentIncomeId !== syncedIncomeId) {
    setSyncedIncomeId(currentIncomeId);
    if (editingIncome) {
      setAmount(String(editingIncome.amount));
      setCategoryId(editingIncome.category_id);
      setDate(editingIncome.date);
      setDescription(editingIncome.description ?? "");
    } else {
      setAmount("");
      setDate(todayAsDateInput());
      setDescription("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return;

    onSubmit({
      amount: numericAmount,
      category_id: categoryId,
      date,
      description: description || null,
      // Un ingreso fijo ya generado se sigue editando acá (monto, categoría,
      // descripción) sin dejar de estar marcado como fijo — mismo criterio
      // que un gasto fijo generado, ver QuickAddExpenseForm.
      is_fixed: editingIncome?.is_fixed ?? false,
      fixed_income_id: editingIncome?.fixed_income_id ?? null,
    });

    if (!editingIncome) {
      setAmount("");
      setDescription("");
    }
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

      <div className="mt-2.5">
        <CategoryChipPicker
          categories={incomeCategories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          onCreateCategory={onCreateCategory}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-brand)" }}
        >
          <CheckIcon />
          {editingIncome ? "Guardar cambios" : "Agregar ingreso"}
        </button>
        {editingIncome && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            <XIcon />
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
