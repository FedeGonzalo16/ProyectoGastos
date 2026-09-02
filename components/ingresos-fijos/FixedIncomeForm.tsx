"use client";

import { useState, type FormEvent } from "react";
import type { FixedIncome } from "@/lib/types";
import { CheckIcon, XIcon } from "@/components/shared/icons";

type FixedIncomeInput = Omit<FixedIncome, "id" | "user_id" | "created_at" | "updated_at">;

interface FixedIncomeFormProps {
  /** Si viene una plantilla, el formulario edita ese registro en vez de crear uno nuevo. */
  editingTemplate: FixedIncome | null;
  onSubmit: (input: FixedIncomeInput) => void;
  onCancelEdit: () => void;
}

const EMPTY_FORM = { name: "", amountEstimate: "", dayOfMonth: "" };

/**
 * Alta y edición de una plantilla de ingreso fijo (ej. sueldo) — mismo
 * formulario para las dos cosas, mismo criterio que `FixedExpenseForm`. Sin
 * categoría a propósito: el nombre ya identifica la plantilla, y la
 * categoría se elige en el ingreso ya generado, editándolo en Mensual — así
 * "editable por si el sueldo cambia" no significa perder el histórico: un
 * cambio de monto acá solo afecta lo que se genere de ahí en adelante.
 */
export function FixedIncomeForm({ editingTemplate, onSubmit, onCancelEdit }: FixedIncomeFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);

  // Mismo patrón de sincronización durante el render que el resto de los
  // formularios de la app (ver FixedExpenseForm).
  const [syncedTemplateId, setSyncedTemplateId] = useState<string | null>(null);
  const currentTemplateId = editingTemplate?.id ?? null;

  if (currentTemplateId !== syncedTemplateId) {
    setSyncedTemplateId(currentTemplateId);
    setForm(
      editingTemplate
        ? {
            name: editingTemplate.name,
            amountEstimate: String(editingTemplate.amount_estimate),
            dayOfMonth: editingTemplate.day_of_month !== null ? String(editingTemplate.day_of_month) : "",
          }
        : EMPTY_FORM
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountEstimate = Number(form.amountEstimate);
    if (!form.name || !amountEstimate) return;

    const trimmedDay = form.dayOfMonth.trim();
    const dayOfMonth = trimmedDay === "" ? null : Number(trimmedDay);
    if (dayOfMonth !== null && (dayOfMonth < 1 || dayOfMonth > 31)) return;

    onSubmit({
      name: form.name,
      amount_estimate: amountEstimate,
      day_of_month: dayOfMonth,
      active: editingTemplate?.active ?? true,
    });

    if (!editingTemplate) setForm(EMPTY_FORM);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-semibold">{editingTemplate ? "Editar ingreso fijo" : "Nuevo ingreso fijo"}</p>

      <div className="mt-3 flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Nombre (ej. Sueldo)"
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
        />

        <div className="flex gap-2.5">
          <label className="flex-1 rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
            <span className="block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
              Monto estimado
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              required
              value={form.amountEstimate}
              onChange={(event) => setForm({ ...form, amountEstimate: event.target.value })}
              className="w-full text-sm outline-none"
              style={{ background: "transparent", color: "var(--color-text)" }}
            />
          </label>
          <label className="w-24 rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
            <span className="block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
              Día (opcional)
            </span>
            <input
              type="number"
              min={1}
              max={31}
              placeholder="1-31"
              value={form.dayOfMonth}
              onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })}
              className="w-full text-sm outline-none"
              style={{ background: "transparent", color: "var(--color-text)" }}
            />
          </label>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-brand)" }}
        >
          <CheckIcon />
          {editingTemplate ? "Guardar cambios" : "Agregar"}
        </button>
        {editingTemplate && (
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
