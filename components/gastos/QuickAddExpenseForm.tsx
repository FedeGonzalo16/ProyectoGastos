"use client";

import { useState, type FormEvent } from "react";
import type { Category, Expense, PaymentMethod } from "@/lib/types";
import { todayAsDateInput } from "@/lib/format";
import { CategoryChipPicker } from "@/components/shared/CategoryChipPicker";
import { CheckIcon, XIcon } from "@/components/shared/icons";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transf." },
];

interface QuickAddExpenseFormProps {
  /** Todas (activas e inactivas) — el picker filtra las inactivas por su cuenta. */
  expenseCategories: Category[];
  onSubmit: (input: Omit<Expense, "id" | "user_id" | "created_at" | "updated_at">) => void;
  onCreateCategory: (name: string) => Category;
  /** Si viene un gasto, el formulario lo edita en vez de crear uno nuevo. */
  editingExpense: Expense | null;
  onCancelEdit: () => void;
  /** Etiquetas ya usadas alguna vez (sin repetir), para el autocompletado del campo Etiqueta. */
  existingTags: string[];
}

/**
 * Alta rápida (o edición) de un gasto diario. Su única responsabilidad es
 * juntar los datos y avisar al padre (`onSubmit`) — no sabe nada de cómo se
 * guardan ni de Supabase.
 */
export function QuickAddExpenseForm({
  expenseCategories,
  onSubmit,
  onCreateCategory,
  editingExpense,
  onCancelEdit,
  existingTags,
}: QuickAddExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(
    expenseCategories.find((category) => category.active)?.id ?? null
  );
  const [date, setDate] = useState(todayAsDateInput());
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("debito");
  const [dueDate, setDueDate] = useState("");
  const [tag, setTag] = useState("");
  // Solo se usa al crear (no editando) — cuántas cuotas genera esta compra en
  // crédito. "" o "1" = un solo pago, no es una compra en cuotas.
  const [installmentCount, setInstallmentCount] = useState("");

  // Cuando cambia qué gasto se está editando (o se pasa a "crear nuevo"),
  // se resetea el formulario con sus valores — durante el render, mismo
  // patrón que el resto de los formularios de la app.
  const [syncedExpenseId, setSyncedExpenseId] = useState<string | null>(null);
  const currentExpenseId = editingExpense?.id ?? null;

  if (currentExpenseId !== syncedExpenseId) {
    setSyncedExpenseId(currentExpenseId);
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setCategoryId(editingExpense.category_id);
      setDate(editingExpense.date);
      setDescription(editingExpense.description ?? "");
      setPaymentMethod(editingExpense.payment_method ?? "debito");
      setDueDate(editingExpense.due_date ?? "");
      setTag(editingExpense.tag ?? "");
    } else {
      setAmount("");
      setDate(todayAsDateInput());
      setDescription("");
      setPaymentMethod("debito");
      setDueDate("");
      setTag("");
    }
    setInstallmentCount("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return;

    const numericInstallmentCount = Number(installmentCount) || 1;

    onSubmit({
      amount: numericAmount,
      category_id: categoryId,
      date,
      description: description || null,
      payment_method: paymentMethod,
      is_fixed: editingExpense?.is_fixed ?? false,
      fixed_expense_id: editingExpense?.fixed_expense_id ?? null,
      due_date: dueDate || null,
      // No se edita acá: se marca desde el listado, para no pisarlo sin
      // querer al guardar otro cambio (ej. corregir el monto).
      is_paid: editingExpense?.is_paid ?? false,
      // Al editar, se conservan tal cual (una cuota ya generada no se puede
      // "volver a partir" desde acá) — ver `lib/repository/planInstallments.ts`,
      // que es quien arma el resto de las cuotas cuando esto es una carga nueva.
      installment_number: editingExpense?.installment_number ?? null,
      installment_count: editingExpense
        ? editingExpense.installment_count
        : numericInstallmentCount > 1
          ? numericInstallmentCount
          : null,
      installment_group_id: editingExpense?.installment_group_id ?? null,
      tag: tag.trim() || null,
    });

    // Limpia solo lo que tiene sentido limpiar entre gastos consecutivos
    // (al crear); al editar, el padre cierra el modo edición.
    if (!editingExpense) {
      setAmount("");
      setDescription("");
      setDueDate("");
      setTag("");
      setInstallmentCount("");
    }
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

      <div className="mt-3">
        <CategoryChipPicker
          categories={expenseCategories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          onCreateCategory={onCreateCategory}
        />
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

      <label className="mt-3.5 block rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--color-border)" }}>
        <span className="block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
          Vencimiento (opcional)
        </span>
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="w-full text-sm outline-none"
          style={{ background: "transparent", color: "var(--color-text)" }}
        />
      </label>

      <label className="mt-3.5 block rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--color-border)" }}>
        <span className="block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
          Etiqueta (opcional)
        </span>
        <input
          type="text"
          list="expense-tag-suggestions"
          placeholder="Ej. Viaje a Bariloche"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          className="w-full text-sm outline-none"
          style={{ background: "transparent", color: "var(--color-text)" }}
        />
        <datalist id="expense-tag-suggestions">
          {existingTags.map((existingTag) => (
            <option key={existingTag} value={existingTag} />
          ))}
        </datalist>
      </label>

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
                onClick={() => {
                  setPaymentMethod(method.value);
                  // Cambiar de medio de pago limpia las cuotas — si no, un
                  // "3 cuotas" cargado con Crédito podría colarse en un
                  // gasto que después se pasa a Débito/Efectivo.
                  if (method.value !== "credito") setInstallmentCount("");
                }}
                className="flex-1 rounded-lg py-2 text-[11.5px]"
                style={
                  isSelected
                    ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)", fontWeight: 600 }
                    : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                }
              >
                {method.label}
              </button>
            );
          })}
        </div>

        {editingExpense?.installment_count && editingExpense.installment_count > 1 ? (
          <p className="mt-2 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
            Cuota {editingExpense.installment_number} de {editingExpense.installment_count} — la cantidad de cuotas no se puede cambiar editando.
          </p>
        ) : (
          !editingExpense &&
          paymentMethod === "credito" && (
            <label className="mt-2 block rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--color-border)" }}>
              <span className="block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
                Cantidad de cuotas (opcional)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="1"
                value={installmentCount}
                onChange={(event) => setInstallmentCount(event.target.value)}
                className="w-full text-sm outline-none"
                style={{ background: "transparent", color: "var(--color-text)" }}
              />
              {Number(installmentCount) > 1 && (
                <span className="mt-1 block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
                  Se van a generar {installmentCount} gastos de {amount ? `$${amount}` : "este monto"}, uno por mes.
                </span>
              )}
            </label>
          )
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold text-white"
          style={{ background: "var(--color-brand)" }}
        >
          <CheckIcon />
          {editingExpense ? "Guardar cambios" : "Guardar gasto"}
        </button>
        {editingExpense && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm"
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
