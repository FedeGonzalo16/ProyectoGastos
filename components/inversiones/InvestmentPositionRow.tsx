"use client";

import { useState } from "react";
import type { Investment } from "@/lib/types";
import { formatShortDate, formatUsd } from "@/lib/format";

const ASSET_TYPE_LABELS: Record<Investment["asset_type"], string> = {
  cripto: "Cripto",
  etf: "ETF",
  moneda: "Moneda",
  otro: "Otro",
};

interface InvestmentPositionRowProps {
  investment: Investment;
  latestReturnPercentage: number | null;
  onUpdateReturn: (returnPercentage: number) => void;
}

/**
 * Una fila de la lista de posiciones. Cada una puede "abrir" un mini
 * formulario para cargar un nuevo % de rendimiento sin salir de la lista —
 * eso es lo único que necesita hacer esta fila, así que el estado de
 * abierto/cerrado vive acá adentro, no en la pantalla que la contiene.
 */
export function InvestmentPositionRow({
  investment,
  latestReturnPercentage,
  onUpdateReturn,
}: InvestmentPositionRowProps) {
  const [isEditingReturn, setIsEditingReturn] = useState(false);
  const [returnInput, setReturnInput] = useState(
    latestReturnPercentage !== null ? String(latestReturnPercentage) : ""
  );

  function handleSaveReturn() {
    const value = Number(returnInput);
    if (Number.isNaN(value)) return;
    onUpdateReturn(value);
    setIsEditingReturn(false);
  }

  const originalAmountLabel =
    investment.currency_original === "ARS"
      ? `$${investment.amount_original.toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS`
      : formatUsd(investment.amount_original);

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[10px] font-bold"
          style={{ background: "var(--color-bg)", color: "var(--color-brand)" }}
        >
          {investment.asset_name.slice(0, 4).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {ASSET_TYPE_LABELS[investment.asset_type]} · {investment.asset_name}
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
            {formatShortDate(investment.date)} · {originalAmountLabel}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[13.5px] font-semibold tabular-nums">{formatUsd(investment.amount_usd)}</div>
          <button
            type="button"
            onClick={() => setIsEditingReturn((open) => !open)}
            className="mt-0.5 text-[11px] font-semibold tabular-nums"
            style={{ color: latestReturnPercentage !== null && latestReturnPercentage >= 0 ? "var(--color-good)" : "var(--color-text-secondary)" }}
          >
            {latestReturnPercentage !== null ? `${latestReturnPercentage > 0 ? "+" : ""}${latestReturnPercentage}%` : "Cargar %"}
          </button>
        </div>
      </div>

      {isEditingReturn && (
        <div className="mt-2.5 flex gap-2 pl-12">
          <input
            type="number"
            step="0.1"
            autoFocus
            placeholder="% rendimiento"
            value={returnInput}
            onChange={(event) => setReturnInput(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
          <button
            type="button"
            onClick={handleSaveReturn}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: "var(--color-brand)" }}
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
