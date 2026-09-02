"use client";

import { useState } from "react";
import type { Investment } from "@/lib/types";
import { formatShortDate, formatUsd } from "@/lib/format";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { ASSET_TYPE_LABELS } from "@/lib/assetTypes";
import { CheckIcon, PencilIcon, TrashIcon } from "@/components/shared/icons";

interface InvestmentPositionRowProps {
  investment: Investment;
  /** Solo aplica a una compra — una venta no tiene rendimiento en el tiempo, es una operación ya cerrada. */
  latestReturnPercentage: number | null;
  /** Color fijo por nombre de activo (ver `groupByAssetName`) — mismo criterio de color que "Totales por activo" y el gráfico de rendimiento por activo. */
  colorIndex: number;
  /** true si esta compra tiene cantidad + símbolo reconocido (ver `autoQuoteCandidates`) — su % ya se calcula solo, no se puede pisar a mano. */
  isAutoQuoted: boolean;
  onUpdateReturn: (returnPercentage: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Una fila de la lista de posiciones. Una compra sin cotización automática
 * puede "abrir" un mini formulario para cargar un nuevo % de rendimiento sin
 * salir de la lista; una con cotización automática solo muestra el % ya
 * calculado (con la etiqueta "auto"), y una venta no tiene nada de esto (ver
 * comentario arriba), en su lugar muestra la ganancia/pérdida realizada.
 */
export function InvestmentPositionRow({
  investment,
  latestReturnPercentage,
  colorIndex,
  isAutoQuoted,
  onUpdateReturn,
  onEdit,
  onDelete,
}: InvestmentPositionRowProps) {
  const [isEditingReturn, setIsEditingReturn] = useState(false);
  const [returnInput, setReturnInput] = useState(
    latestReturnPercentage !== null ? String(latestReturnPercentage) : ""
  );

  const isSale = investment.kind === "venta";

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

  const realizedGain = isSale ? investment.amount_usd - (investment.cost_basis_usd ?? 0) : null;

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[10px] font-bold"
          style={{ background: "var(--color-bg)", color: categoricalColorVar(colorIndex) }}
        >
          {investment.asset_name.slice(0, 4).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <span>
              {ASSET_TYPE_LABELS[investment.asset_type]} · {investment.asset_name}
            </span>
            {isSale && (
              <span
                className="rounded-[5px] border px-1 text-[9.5px] font-semibold"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                VENTA
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
            {formatShortDate(investment.date)} · {originalAmountLabel}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[13.5px] font-semibold tabular-nums">{formatUsd(investment.amount_usd)}</div>
          {isSale ? (
            <div
              className="mt-0.5 text-[11px] font-semibold tabular-nums"
              style={{ color: (realizedGain ?? 0) >= 0 ? "var(--color-good)" : "var(--chart-8)" }}
            >
              {(realizedGain ?? 0) >= 0 ? "+" : ""}
              {formatUsd(realizedGain ?? 0)}
            </div>
          ) : isAutoQuoted ? (
            <div
              className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-semibold tabular-nums"
              style={{ color: latestReturnPercentage !== null && latestReturnPercentage >= 0 ? "var(--color-good)" : "var(--color-text-secondary)" }}
              title="Se calcula solo con la cotización en vivo (CoinGecko)"
            >
              {latestReturnPercentage !== null ? `${latestReturnPercentage > 0 ? "+" : ""}${latestReturnPercentage.toFixed(1)}%` : "…"}
              <span
                className="rounded-[5px] px-1 text-[9px] font-semibold tracking-wide uppercase"
                style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}
              >
                auto
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingReturn((open) => !open)}
              className="mt-0.5 text-[11px] font-semibold tabular-nums"
              style={{ color: latestReturnPercentage !== null && latestReturnPercentage >= 0 ? "var(--color-good)" : "var(--color-text-secondary)" }}
            >
              {latestReturnPercentage !== null ? `${latestReturnPercentage > 0 ? "+" : ""}${latestReturnPercentage}%` : "Cargar %"}
            </button>
          )}
        </div>
      </div>

      {isEditingReturn && !isSale && !isAutoQuoted && (
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
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: "var(--color-brand)" }}
          >
            <CheckIcon />
            Guardar
          </button>
        </div>
      )}

      <div className="mt-2 flex gap-3 pl-12">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: "var(--color-brand)" }}
        >
          <PencilIcon />
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 text-[11px]"
          style={{ color: "var(--chart-8)" }}
        >
          <TrashIcon />
          Borrar
        </button>
      </div>
    </div>
  );
}
