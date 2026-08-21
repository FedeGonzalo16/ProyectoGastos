"use client";

import { useState, type FormEvent } from "react";
import type { Category, FixedExpense } from "@/lib/types";

type FixedExpenseInput = Omit<FixedExpense, "id" | "user_id" | "created_at" | "updated_at">;

interface FixedExpenseFormProps {
  expenseCategories: Category[];
  /** Si viene una plantilla, el formulario edita ese registro en vez de crear uno nuevo. */
  editingTemplate: FixedExpense | null;
  onSubmit: (input: FixedExpenseInput) => void;
  onCancelEdit: () => void;
}

const EMPTY_FORM = { name: "", amountEstimate: "", dayOfMonth: "1", categoryId: null as string | null };

/**
 * Alta y edición de una plantilla de gasto fijo. El mismo formulario sirve
 * para las dos cosas: si `editingTemplate` tiene un valor, precarga sus
 * datos y al guardar actualiza esa plantilla en vez de crear una nueva.
 */
export function FixedExpenseForm({
  expenseCategories,
  editingTemplate,
  onSubmit,
  onCancelEdit,
}: FixedExpenseFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);

  // Cuando cambia qué plantilla se está editando (o se pasa a "crear
  // nueva"), hay que resetear el formulario con sus valores. Se hace acá,
  // durante el render, en vez de en un useEffect: es el patrón que React
  // recomienda para "ajustar un estado cuando cambia una prop" — evita un
  // render de más con datos viejos (ver "You Might Not Need An Effect").
  const [syncedTemplateId, setSyncedTemplateId] = useState<string | null>(null);
  const currentTemplateId = editingTemplate?.id ?? null;

  if (currentTemplateId !== syncedTemplateId) {
    setSyncedTemplateId(currentTemplateId);
    setForm(
      editingTemplate
        ? {
            name: editingTemplate.name,
            amountEstimate: String(editingTemplate.amount_estimate),
            dayOfMonth: String(editingTemplate.day_of_month),
            categoryId: editingTemplate.category_id,
          }
        : { ...EMPTY_FORM, categoryId: expenseCategories[0]?.id ?? null }
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountEstimate = Number(form.amountEstimate);
    const dayOfMonth = Number(form.dayOfMonth);
    if (!form.name || !amountEstimate || dayOfMonth < 1 || dayOfMonth > 31) return;

    onSubmit({
      name: form.name,
      amount_estimate: amountEstimate,
      day_of_month: dayOfMonth,
      category_id: form.categoryId,
      active: editingTemplate?.active ?? true,
    });

    if (!editingTemplate) setForm({ ...EMPTY_FORM, categoryId: expenseCategories[0]?.id ?? null });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-semibold">{editingTemplate ? "Editar gasto fijo" : "Nuevo gasto fijo"}</p>

      <div className="mt-3 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Nombre (ej. Alquiler)"
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
        />

        <div className="flex gap-2.5">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            placeholder="Monto estimado"
            value={form.amountEstimate}
            onChange={(event) => setForm({ ...form, amountEstimate: event.target.value })}
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
          <input
            type="number"
            min={1}
            max={31}
            required
            placeholder="Día"
            value={form.dayOfMonth}
            onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })}
            className="w-20 rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
        </div>

        <select
          value={form.categoryId ?? ""}
          onChange={(event) => setForm({ ...form, categoryId: event.target.value || null })}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
        >
          <option value="">Sin categoría</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-brand)" }}
        >
          {editingTemplate ? "Guardar cambios" : "Agregar"}
        </button>
        {editingTemplate && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-xl px-4 py-2.5 text-sm"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
