"use client";

import { useState, type FormEvent } from "react";
import type { AssetType, Currency, Investment } from "@/lib/types";
import { todayAsDateInput } from "@/lib/format";

type InvestmentInput = Omit<Investment, "id" | "user_id" | "created_at" | "updated_at">;

interface InvestmentFormProps {
  onSubmit: (input: InvestmentInput) => void;
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "cripto", label: "Cripto" },
  { value: "etf", label: "ETF" },
  { value: "moneda", label: "Moneda" },
  { value: "otro", label: "Otro" },
];

/** Convierte el monto original a USD (moneda base) según la moneda de carga. */
function convertToUsd(amount: number, currency: Currency, exchangeRate: number | null): number {
  if (currency === "USD") return amount;
  if (!exchangeRate || exchangeRate <= 0) return 0;
  return amount / exchangeRate;
}

/**
 * Alta de una posición de inversión: guarda el monto en su moneda original
 * y, si se cargó en pesos, también el equivalente en USD (moneda base) según
 * el tipo de cambio del día — así el total de la cartera siempre se puede
 * consolidar en una sola moneda.
 */
export function InvestmentForm({ onSubmit }: InvestmentFormProps) {
  const [assetType, setAssetType] = useState<AssetType>("cripto");
  const [assetName, setAssetName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [exchangeRate, setExchangeRate] = useState("");
  const [date, setDate] = useState(todayAsDateInput());

  const numericAmount = Number(amount) || 0;
  const numericExchangeRate = Number(exchangeRate) || null;
  const previewUsd = convertToUsd(numericAmount, currency, numericExchangeRate);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!assetName || numericAmount <= 0) return;
    if (currency === "ARS" && (!numericExchangeRate || numericExchangeRate <= 0)) return;

    onSubmit({
      date,
      asset_type: assetType,
      asset_name: assetName,
      amount_original: numericAmount,
      currency_original: currency,
      exchange_rate: currency === "ARS" ? numericExchangeRate : null,
      amount_usd: previewUsd,
    });

    setAssetName("");
    setAmount("");
    setExchangeRate("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-semibold">Nueva inversión</p>

      <p className="mt-3.5 text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
        Activo
      </p>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
        {ASSET_TYPES.map((type) => {
          const isSelected = type.value === assetType;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => setAssetType(type.value)}
              className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold"
              style={
                isSelected
                  ? { background: "var(--color-brand-soft)", color: "var(--color-brand)", border: "1.5px solid var(--color-brand)" }
                  : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
              }
            >
              {type.label}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        required
        placeholder="Nombre / ticker (ej. BTC, USDT, SPY500)"
        value={assetName}
        onChange={(event) => setAssetName(event.target.value)}
        className="mt-2.5 w-full rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
      />

      <div className="mt-2.5 flex gap-2.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          placeholder="Monto"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
        />
        <div className="flex shrink-0 gap-1">
          {(["ARS", "USD"] as Currency[]).map((option) => {
            const isSelected = option === currency;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setCurrency(option)}
                className="rounded-lg px-3 py-2 text-xs font-semibold"
                style={
                  isSelected
                    ? { background: "var(--color-brand-soft)", color: "var(--color-brand)" }
                    : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {currency === "ARS" && (
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          placeholder="Tipo de cambio del día (ARS por USD)"
          value={exchangeRate}
          onChange={(event) => setExchangeRate(event.target.value)}
          className="mt-2.5 w-full rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
        />
      )}

      <input
        type="date"
        required
        value={date}
        onChange={(event) => setDate(event.target.value)}
        className="mt-2.5 w-full rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
      />

      {currency === "ARS" && previewUsd > 0 && (
        <p className="mt-2 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
          ≈ equivalente <span className="font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>
            US$ {previewUsd.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </span>
        </p>
      )}

      <button
        type="submit"
        className="mt-3.5 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
        style={{ background: "var(--color-brand)" }}
      >
        Guardar inversión
      </button>
    </form>
  );
}
