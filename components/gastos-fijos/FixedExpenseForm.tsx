"use client";

import { useState, type FormEvent } from "react";
import type { FixedExpense } from "@/lib/types";
import { CheckIcon, XIcon } from "@/components/shared/icons";

type FixedExpenseInput = Omit<FixedExpense, "id" | "user_id" | "created_at" | "updated_at">;

interface FixedExpenseFormProps {
  /** Si viene una plantilla, el formulario edita ese registro en vez de crear uno nuevo. */
  editingTemplate: FixedExpense | null;
  onSubmit: (input: FixedExpenseInput) => void;
  onCancelEdit: () => void;
}

const EMPTY_FORM = { name: "", amountEstimate: "", dayOfMonth: "" };

/**
 * Alta y edición de una plantilla de gasto fijo. El mismo formulario sirve
 * para las dos cosas: si `editingTemplate` tiene un valor, precarga sus
 * datos y al guardar actualiza esa plantilla en vez de crear una nueva.
 *
 * No tiene categoría a propósito: el nombre ya identifica la plantilla, y la
 * categoría (si hace falta para el análisis por categoría) se elige en el
 * gasto ya generado, editándolo en Gastos.
 */
export function FixedExpenseForm({ editingTemplate, onSubmit, onCancelEdit }: FixedExpenseFormProps) {
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
            dayOfMonth: editingTemplate.day_of_month !== null ? String(editingTemplate.day_of_month) : "",
          }
        : EMPTY_FORM
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountEstimate = Number(form.amountEstimate);
    if (!form.name || !amountEstimate) return;

    // El día es opcional: si se deja vacío, se guarda `null` (se genera el
    // día 1 de cada mes, ver `generateFixedExpenses.ts`). Si se completó,
    // tiene que estar dentro del rango válido. También es el vencimiento por
    // defecto del gasto generado — editable después mes a mes si hace falta
    // (ej. la tarjeta, que no siempre cierra el mismo día).
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
          {/*
            Con label fija arriba (no placeholder): "Día" arranca con el
            valor "1" precargado, así que su placeholder nunca se llegaba a
            ver y el campo quedaba sin explicación en pantalla.
          */}
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
