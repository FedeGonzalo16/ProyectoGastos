"use client";

import { useState } from "react";
import type { Currency } from "@/lib/types";

export interface MonthlyInvestmentGoalValue {
  amount: number | null;
  currency: Currency;
}

interface MonthlyInvestmentGoalFieldProps {
  value: MonthlyInvestmentGoalValue;
  /** Cotización del día (ver Inversiones) — hace falta para poder guardar en ARS. */
  exchangeRate: number | null;
  onSave: (value: MonthlyInvestmentGoalValue) => void;
}

const CURRENCIES: Currency[] = ["ARS", "USD"];

/**
 * El mínimo a invertir por mes, en ARS o USD — igual que al cargar una
 * inversión. Guarda lo que se escribió tal cual; la conversión a USD (para
 * poder comparar contra los aportes reales) la hace quien use este
 * componente, con la cotización actual.
 */
export function MonthlyInvestmentGoalField({ value, exchangeRate, onSave }: MonthlyInvestmentGoalFieldProps) {
  const [input, setInput] = useState(value.amount !== null ? String(value.amount) : "");
  const [currency, setCurrency] = useState<Currency>(value.currency);

  const needsExchangeRate = currency === "ARS" && exchangeRate === null;

  function commit(nextCurrency: Currency) {
    const trimmed = input.trim();
    if (trimmed === "") {
      onSave({ amount: null, currency: nextCurrency });
      return;
    }
    const parsed = Number(trimmed);
    if (parsed > 0 && !(nextCurrency === "ARS" && exchangeRate === null)) {
      onSave({ amount: parsed, currency: nextCurrency });
    }
  }

  function handleSelectCurrency(nextCurrency: Currency) {
    setCurrency(nextCurrency);
    commit(nextCurrency);
  }

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-semibold">Mínimo a invertir por mes</p>
      <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Cuánto querés aportar a inversiones este mes, como mínimo (se compara en Inversiones).
      </p>

      <div className="mt-2.5 flex gap-2">
        <div
          className="flex flex-1 items-center gap-1.5 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            {currency === "USD" ? "US$" : "$"}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Sin definir"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onBlur={() => commit(currency)}
            className="w-full text-sm outline-none"
            style={{ background: "transparent", color: "var(--color-text)" }}
          />
        </div>
        <div className="flex shrink-0 gap-1">
          {CURRENCIES.map((option) => {
            const isSelected = option === currency;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelectCurrency(option)}
                className="rounded-lg px-3 py-2 text-xs font-semibold"
                style={
                  isSelected
                    ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)" }
                    : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {needsExchangeRate && (
        <p className="mt-2 text-[11px]" style={{ color: "var(--chart-8)" }}>
          Para guardarlo en pesos, definí antes la cotización del día en Inversiones.
        </p>
      )}
    </section>
  );
}
