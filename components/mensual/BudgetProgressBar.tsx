"use client";

import { formatArs } from "@/lib/format";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";

interface BudgetProgressBarProps {
  label: string;
  barColor: string;
  spent: number;
  budget: number;
  /** 0-100, ya recortado. */
  percentage: number;
  isOverBudget: boolean;
}

/**
 * Una barra "gastado / tope", en rojo si ya se pasó del presupuesto. Sirve
 * tanto para un tope por categoría como para el tope total del mes — no
 * sabe de dónde viene el label ni el color, solo los pinta.
 */
export function BudgetProgressBar({ label, barColor, spent, budget, percentage, isOverBudget }: BudgetProgressBarProps) {
  const resolvedColor = isOverBudget ? "var(--chart-8)" : barColor;
  const isRevealed = useRevealAnimation();

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums" style={{ color: isOverBudget ? "var(--chart-8)" : "var(--color-text-secondary)" }}>
          {formatArs(spent)} <span style={{ color: "var(--color-text-secondary)" }}>de {formatArs(budget)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-grid)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${isRevealed ? percentage : 0}%`,
            background: resolvedColor,
            transition: "width 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
    </div>
  );
}
