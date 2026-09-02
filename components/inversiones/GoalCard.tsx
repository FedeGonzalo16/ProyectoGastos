"use client";

import Link from "next/link";
import { useState } from "react";
import type { InvestmentGoal } from "@/lib/types";
import { formatArs, formatShortDate, formatUsd } from "@/lib/format";
import { currentYearMonth } from "@/lib/dateRange";
import { requiredMonthlySavingsUsd } from "@/lib/aggregations/investmentSummary";

export interface GoalInput {
  target_amount_usd: number | null;
  target_date: string | null;
}

interface GoalCardProps {
  goal: InvestmentGoal | null;
  totalInvestedUsd: number;
  /** Cuánto se aportó (invirtió) este mes, para comparar contra la meta mensual. */
  contributionsThisMonthUsd: number;
  onSave: (input: GoalInput) => void;
}

function toFormValue(value: number | null): string {
  return value === null ? "" : String(value);
}

/** El aporte mensual, formateado en la moneda con la que se definió (ARS o USD). */
function formatMonthlyContributionTarget(goal: InvestmentGoal): string {
  if (goal.monthly_contribution_amount === null) return "";
  return goal.monthly_contribution_currency === "ARS"
    ? formatArs(goal.monthly_contribution_amount)
    : formatUsd(goal.monthly_contribution_amount);
}

/**
 * Meta de inversión: "llegar a US$X" (con barra de progreso, editable acá) y
 * "aportar por mes" (comparado contra lo que ya se aportó este mes) — ese
 * segundo objetivo se define en Presupuestos, no acá, porque admite ARS o
 * USD y esa conversión ya vive resuelta en un solo lugar.
 */
export function GoalCard({ goal, totalInvestedUsd, contributionsThisMonthUsd, onSave }: GoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState(toFormValue(goal?.target_amount_usd ?? null));
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? "");

  const hasGoal = goal && (goal.target_amount_usd !== null || goal.monthly_contribution_usd !== null);
  const requiredMonthlySavings = goal
    ? requiredMonthlySavingsUsd(goal.target_amount_usd, goal.target_date, totalInvestedUsd, currentYearMonth())
    : null;

  function handleSave() {
    onSave({
      target_amount_usd: targetAmount.trim() === "" ? null : Number(targetAmount),
      target_date: targetDate.trim() === "" ? null : targetDate,
    });
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <p className="text-sm font-semibold">Meta de inversión</p>

        <label className="mt-3 block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
          Llegar a (USD, opcional)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="ej. 10000"
            value={targetAmount}
            onChange={(event) => setTargetAmount(event.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
        </label>

        <label className="mt-2.5 block text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
          Para el (fecha, opcional)
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
        </label>

        <p className="mt-3 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
          El mínimo a aportar por mes (en ARS o USD) se define en{" "}
          <Link href="/presupuestos" className="font-semibold" style={{ color: "var(--color-brand)" }}>
            Presupuestos
          </Link>
          .
        </p>

        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--color-brand)" }}
          >
            Guardar meta
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-xl px-4 py-2.5 text-sm"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Cancelar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border p-5"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Meta de inversión</p>
        <button type="button" onClick={() => setIsEditing(true)} className="text-[11px] font-semibold" style={{ color: "var(--color-brand)" }}>
          {hasGoal ? "Editar" : "Definir meta"}
        </button>
      </div>

      {!hasGoal && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Todavía no definiste una meta.
        </p>
      )}

      {goal?.target_amount_usd !== null && goal?.target_amount_usd !== undefined && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <span>
              {formatUsd(totalInvestedUsd)} de {formatUsd(goal.target_amount_usd)}
              {goal.target_date ? ` · para ${formatShortDate(goal.target_date)}` : ""}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>
              {Math.min(100, Math.round((totalInvestedUsd / goal.target_amount_usd) * 100))}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-grid)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (totalInvestedUsd / goal.target_amount_usd) * 100)}%`,
                background: "var(--color-brand)",
              }}
            />
          </div>

          {requiredMonthlySavings !== null && (
            <p className="mt-2 text-[11.5px]" style={{ color: "var(--color-text-secondary)" }}>
              {requiredMonthlySavings === 0
                ? "¡Ya llegaste a la meta! 🎉"
                : `Para llegar, te conviene ahorrar ~${formatUsd(requiredMonthlySavings)}/mes de acá a esa fecha.`}
            </p>
          )}
        </div>
      )}

      {goal?.monthly_contribution_usd !== null && goal?.monthly_contribution_usd !== undefined && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Aportaste{" "}
          <span className="font-semibold" style={{ color: "var(--color-text)" }}>
            {formatUsd(contributionsThisMonthUsd)}
          </span>{" "}
          de {formatMonthlyContributionTarget(goal)} este mes
        </p>
      )}
    </section>
  );
}
