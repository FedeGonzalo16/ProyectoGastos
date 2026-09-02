"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { AssetType, Currency, Investment, InvestmentKind } from "@/lib/types";
import type { AssetPosition } from "@/lib/aggregations/investmentSummary";
import { formatUsd, todayAsDateInput } from "@/lib/format";
import { resolveCoinGeckoId } from "@/lib/crypto/coinGeckoIds";
import { ASSET_TYPES } from "@/lib/assetTypes";
import { CheckIcon, XIcon } from "@/components/shared/icons";

type InvestmentInput = Omit<Investment, "id" | "user_id" | "created_at" | "updated_at">;

interface InvestmentFormProps {
  onSubmit: (input: InvestmentInput) => void;
  /** Si viene una inversión, el formulario la edita en vez de crear una nueva. */
  editingInvestment: Investment | null;
  onCancelEdit: () => void;
  /** Posiciones netas actuales (ver `groupByAssetName`) — de acá sale tanto el tope de cuánto se puede vender de cada activo como el picker de "qué vendo" (una venta elige un activo existente, no tipea uno nuevo). */
  positions: AssetPosition[];
  /** Dólar blue de hoy, para autocompletar "tipo de cambio del día" — `null` mientras no se pudo traer. */
  currentExchangeRate: number | null;
}

const KINDS: { value: InvestmentKind; label: string }[] = [
  { value: "compra", label: "Compra" },
  { value: "venta", label: "Venta" },
];

// Tolerancia para no rechazar por un centavo de diferencia por redondeo.
const COST_BASIS_EPSILON = 0.01;

/** Convierte el monto original a USD (moneda base) según la moneda de carga. */
function convertToUsd(amount: number, currency: Currency, exchangeRate: number | null): number {
  if (currency === "USD") return amount;
  if (!exchangeRate || exchangeRate <= 0) return 0;
  return amount / exchangeRate;
}

/**
 * Alta de una posición de inversión — compra (default) o venta. En una
 * compra, el monto es lo aportado; en una venta, es lo RECIBIDO, y además
 * pide cuánto de lo ya invertido en ese activo libera ("costo de lo
 * vendido"), para poder calcular la ganancia/pérdida realizada. El monto se
 * guarda en su moneda original y, si se cargó en pesos, también el
 * equivalente en USD (moneda base) según el tipo de cambio del día.
 */
export function InvestmentForm({
  onSubmit,
  editingInvestment,
  onCancelEdit,
  positions,
  currentExchangeRate,
}: InvestmentFormProps) {
  const [assetType, setAssetType] = useState<AssetType>("cripto");
  const [kind, setKind] = useState<InvestmentKind>("compra");
  const [assetName, setAssetName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [exchangeRate, setExchangeRate] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [quantity, setQuantity] = useState("");
  const [marketSymbol, setMarketSymbol] = useState("");
  // Por defecto el símbolo para la cotización automática es el mismo nombre/
  // ticker de arriba (lo normal, ej. "BTC") — este toggle solo aparece para
  // el caso raro en que ese nombre no es el ticker real (ej. "SPY500").
  const [showSymbolOverride, setShowSymbolOverride] = useState(false);
  const [date, setDate] = useState(todayAsDateInput());

  // Cuando cambia qué inversión se está editando (o se pasa a "crear
  // nueva"), se resetea el formulario con sus valores — durante el render,
  // no en un efecto (mismo patrón que FixedExpenseForm).
  const [syncedInvestmentId, setSyncedInvestmentId] = useState<string | null>(null);
  const currentInvestmentId = editingInvestment?.id ?? null;

  if (currentInvestmentId !== syncedInvestmentId) {
    setSyncedInvestmentId(currentInvestmentId);
    if (editingInvestment) {
      setAssetType(editingInvestment.asset_type);
      setKind(editingInvestment.kind);
      setAssetName(editingInvestment.asset_name);
      setAmount(String(editingInvestment.amount_original));
      setCurrency(editingInvestment.currency_original);
      setExchangeRate(editingInvestment.exchange_rate !== null ? String(editingInvestment.exchange_rate) : "");
      setCostBasis(editingInvestment.cost_basis_usd !== null ? String(editingInvestment.cost_basis_usd) : "");
      setQuantity(editingInvestment.quantity !== null ? String(editingInvestment.quantity) : "");
      // Solo se muestra como "override" si de verdad difiere del nombre —
      // si coincide, es el caso normal (símbolo auto-derivado del nombre).
      const isOverride =
        editingInvestment.market_symbol !== null &&
        editingInvestment.market_symbol !== editingInvestment.asset_name.trim().toUpperCase();
      setMarketSymbol(isOverride ? (editingInvestment.market_symbol ?? "") : "");
      setShowSymbolOverride(isOverride);
      setDate(editingInvestment.date);
    } else {
      setAssetType("cripto");
      setKind("compra");
      setAssetName("");
      setAmount("");
      setCurrency("ARS");
      setExchangeRate("");
      setCostBasis("");
      setQuantity("");
      setMarketSymbol("");
      setShowSymbolOverride(false);
      setDate(todayAsDateInput());
    }
  }

  // Neto por activo (para el tope de venta) y qué mostrar en el picker de
  // "qué vendo" — si se está editando una venta cuyo activo ya no aparece
  // en `positions` (ej. quedó en 0 por esta misma venta), se lo agrega igual
  // para no perder de vista la selección ya hecha.
  const netInvestedByAssetName = useMemo(() => new Map(positions.map((position) => [position.assetName, position.totalUsd])), [positions]);
  const sellablePositions = useMemo(() => {
    if (editingInvestment?.kind === "venta" && !positions.some((position) => position.assetName === editingInvestment.asset_name)) {
      return [
        ...positions,
        {
          assetName: editingInvestment.asset_name,
          assetType: editingInvestment.asset_type,
          totalUsd: 0,
          percentageOfTotal: 0,
          latestReturnPercentage: null,
        },
      ];
    }
    return positions;
  }, [positions, editingInvestment]);

  function handleSelectSellablePosition(position: AssetPosition) {
    setAssetName(position.assetName);
    setAssetType(position.assetType);
  }

  // En una compra de cripto, el Monto es opcional: si no sabés (o no te
  // importa) cuánto pagaste, podés cargar solo la cantidad y listo — esa
  // posición simplemente no calcula % de rendimiento (no hay costo contra
  // qué compararla, ver `autoQuoteCandidates`), en vez de forzar a inventar
  // un monto para poder guardar.
  const isCryptoCompra = assetType === "cripto" && kind === "compra";
  const numericAmount = Number(amount) || 0;
  // El campo de tipo de cambio arranca vacío y usa el dólar blue de hoy como
  // valor por defecto (editable) — solo se pisa por el valor tipeado cuando
  // el usuario escribe algo. Al editar una carga vieja, exchangeRate ya viene
  // seteado con lo que se usó ese día (ver sync de arriba), así que acá nunca
  // se reemplaza por el de hoy.
  const effectiveExchangeRateInput = exchangeRate !== "" ? exchangeRate : (currentExchangeRate !== null ? String(currentExchangeRate) : "");
  const numericExchangeRate = Number(effectiveExchangeRateInput) || null;
  const previewUsd = convertToUsd(numericAmount, currency, numericExchangeRate);
  const numericCostBasis = Number(costBasis) || 0;
  const numericQuantity = Number(quantity) || 0;
  // El símbolo para la cotización automática es, por defecto, el nombre/
  // ticker de arriba — el override manual solo pisa eso si está visible y
  // tiene algo cargado (ver `showSymbolOverride`).
  const trimmedAssetName = assetName.trim();
  const autoSymbol = trimmedAssetName.toUpperCase();
  const trimmedSymbolOverride = marketSymbol.trim();
  const effectiveSymbol = showSymbolOverride && trimmedSymbolOverride ? trimmedSymbolOverride.toUpperCase() : autoSymbol;
  const resolvedCoinGeckoId = effectiveSymbol ? resolveCoinGeckoId(effectiveSymbol) : null;

  // Si se está editando ESTA MISMA venta, hay que "devolverle" lo que ya
  // había liberado antes de re-validar — si no, el tope quedaría más chico
  // de lo real solo por estar editándola (se estaría restando dos veces).
  const ownPriorCostBasis =
    editingInvestment?.kind === "venta" && editingInvestment.asset_name === assetName
      ? (editingInvestment.cost_basis_usd ?? 0)
      : 0;
  const maxCostBasis = (netInvestedByAssetName.get(assetName) ?? 0) + ownPriorCostBasis;
  const realizedGain = previewUsd - numericCostBasis;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!assetName || (numericAmount <= 0 && !isCryptoCompra)) return;
    if (currency === "ARS" && (!numericExchangeRate || numericExchangeRate <= 0)) return;

    let costBasisUsd: number | null = null;
    if (kind === "venta") {
      if (numericCostBasis <= 0 || numericCostBasis > maxCostBasis + COST_BASIS_EPSILON) return;
      costBasisUsd = numericCostBasis;
    }

    onSubmit({
      date,
      asset_type: assetType,
      asset_name: assetName,
      kind,
      amount_original: numericAmount,
      currency_original: currency,
      exchange_rate: currency === "ARS" ? numericExchangeRate : null,
      amount_usd: previewUsd,
      cost_basis_usd: costBasisUsd,
      quantity: assetType === "cripto" && numericQuantity > 0 ? numericQuantity : null,
      market_symbol: assetType === "cripto" && effectiveSymbol ? effectiveSymbol : null,
    });

    if (!editingInvestment) {
      setAssetName("");
      setAmount("");
      setExchangeRate("");
      setCostBasis("");
      setQuantity("");
      setMarketSymbol("");
      setShowSymbolOverride(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div className="flex gap-2">
        {KINDS.map((option) => {
          const isSelected = option.value === kind;
          return (
            <button
              key={option.value}
              type="button"
              // El tipo se fija al crear y no se puede cambiar editando: una
              // venta es una operación nueva, no la misma compra "convertida"
              // — si se pudiera tocar acá, editar terminaría reemplazando el
              // registro de la compra original en vez de crear la venta como
              // una fila aparte (ver InvestmentPositionRow/nueva/page.tsx).
              disabled={editingInvestment !== null}
              onClick={() => {
                // Se limpia el activo elegido al cambiar de compra a venta (o
                // viceversa) — una venta elige de la lista de posiciones, una
                // compra tipea libre, mezclar el valor de una en la otra confunde.
                setKind(option.value);
                setAssetName("");
              }}
              className="flex-1 rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
              style={
                isSelected
                  ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)" }
                  : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {editingInvestment !== null && (
        <p className="mt-1 text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
          El tipo no se puede cambiar editando — para vender algo, cargalo como una inversión nueva.
        </p>
      )}

      {kind === "compra" ? (
        <>
          <p className="mt-3 text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
            Activo
          </p>
          <div className="chip-scroll mt-1.5 flex gap-2 overflow-x-auto pb-1">
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
                      ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)", border: "1.5px solid var(--color-toggle)" }
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
        </>
      ) : (
        <>
          <p className="mt-3 text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
            ¿Qué vendés?
          </p>
          {sellablePositions.length === 0 ? (
            <p className="mt-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              No tenés ninguna posición cargada todavía — para vender algo primero tiene que existir una compra.
            </p>
          ) : (
            <div className="chip-scroll mt-1.5 flex gap-2 overflow-x-auto pb-1">
              {sellablePositions.map((position) => {
                const isSelected = position.assetName === assetName;
                const typeLabel = ASSET_TYPES.find((type) => type.value === position.assetType)?.label ?? position.assetType;
                return (
                  <button
                    key={position.assetName}
                    type="button"
                    onClick={() => handleSelectSellablePosition(position)}
                    className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold"
                    style={
                      isSelected
                        ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)", border: "1.5px solid var(--color-toggle)" }
                        : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                    }
                  >
                    {position.assetName} <span style={{ opacity: 0.7 }}>· {typeLabel} · {formatUsd(position.totalUsd)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-2.5 flex gap-2.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required={!isCryptoCompra}
          placeholder={kind === "venta" ? "Monto recibido" : isCryptoCompra ? "Monto (opcional)" : "Monto"}
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

      {currency === "ARS" && (
        <div className="mt-2.5">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            placeholder="Tipo de cambio del día (ARS por USD)"
            value={effectiveExchangeRateInput}
            onChange={(event) => setExchangeRate(event.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
          {exchangeRate === "" && currentExchangeRate !== null && (
            <p className="mt-1 text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
              Dólar blue de hoy — cambialo si esta carga corresponde a otra fecha.
            </p>
          )}
        </div>
      )}

      {kind === "venta" && (
        <div className="mt-2.5">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            placeholder="Costo de lo vendido (USD)"
            value={costBasis}
            onChange={(event) => setCostBasis(event.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
              {maxCostBasis > 0
                ? `Tenés ${formatUsd(maxCostBasis)} invertido en ${assetName || "este activo"}.`
                : `No tenés una posición cargada en ${assetName || "este activo"}.`}
            </p>
            {maxCostBasis > 0 && (
              <button
                type="button"
                onClick={() => setCostBasis(String(maxCostBasis))}
                className="shrink-0 text-[11px] font-semibold"
                style={{ color: "var(--color-brand)" }}
              >
                Usar todo
              </button>
            )}
          </div>
        </div>
      )}

      {assetType === "cripto" && (
        <div className="mt-2.5 rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-text-secondary)" }}>
            Cotización automática (opcional)
          </p>
          <p className="mt-1 text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
            Si cargás la cantidad, el % de rendimiento se calcula solo con el precio en vivo (CoinGecko) — si no, se sigue cargando a mano, como antes.
          </p>

          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder={kind === "venta" ? "Cantidad vendida" : "Cantidad (ej. 0.05)"}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
          />

          {/* Chequeo rápido para notar un Monto que no tiene nada que ver con
              la cantidad ANTES de guardar (ej. tipear el monto de otra
              compra sin querer) — un costo mucho más chico o grande que el
              precio real del activo hoy es la pista de que algo no cierra. */}
          {kind === "compra" && numericQuantity > 0 && previewUsd > 0 && (
            <p className="mt-1.5 text-[10.5px]" style={{ color: "var(--color-text-secondary)" }}>
              ≈ {formatUsd(previewUsd / numericQuantity)} por unidad — revisá que tenga sentido con el precio real de hoy.
            </p>
          )}

          {!showSymbolOverride ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p
                className="text-[10.5px]"
                style={{ color: trimmedAssetName && resolvedCoinGeckoId ? "var(--color-good)" : "var(--color-text-secondary)" }}
              >
                {!trimmedAssetName
                  ? "El símbolo se toma del nombre/ticker de arriba."
                  : resolvedCoinGeckoId
                    ? `✓ "${autoSymbol}" tiene cotización automática.`
                    : `"${autoSymbol}" no es un ticker reconocido.`}
              </p>
              <button
                type="button"
                onClick={() => setShowSymbolOverride(true)}
                className="shrink-0 text-[10.5px] font-semibold"
                style={{ color: "var(--color-brand)" }}
              >
                Usar otro símbolo
              </button>
            </div>
          ) : (
            <div className="mt-1.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Símbolo real (ej. BTC)"
                  value={marketSymbol}
                  onChange={(event) => setMarketSymbol(event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSymbolOverride(false);
                    setMarketSymbol("");
                  }}
                  className="shrink-0 text-[10.5px] font-semibold"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Cancelar
                </button>
              </div>
              <p
                className="mt-1 text-[10.5px]"
                style={{ color: trimmedSymbolOverride && !resolvedCoinGeckoId ? "var(--chart-8)" : "var(--color-text-secondary)" }}
              >
                {trimmedSymbolOverride === ""
                  ? 'Para cuando el nombre de arriba no es el ticker real (ej. "SPY500").'
                  : resolvedCoinGeckoId
                    ? `✓ cotización automática con "${effectiveSymbol}".`
                    : "Símbolo no reconocido — esta posición sigue con % de rendimiento manual."}
              </p>
            </div>
          )}
        </div>
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

      {kind === "venta" && numericCostBasis > 0 && (
        <p className="mt-2 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
          {realizedGain >= 0 ? "Ganancia" : "Pérdida"} realizada:{" "}
          <span className="font-semibold tabular-nums" style={{ color: realizedGain >= 0 ? "var(--color-good)" : "var(--chart-8)" }}>
            {realizedGain >= 0 ? "+" : ""}
            {formatUsd(realizedGain)}
          </span>
        </p>
      )}

      <div className="mt-3.5 flex gap-2">
        <button
          type="submit"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-brand)" }}
        >
          <CheckIcon />
          {editingInvestment ? "Guardar cambios" : kind === "venta" ? "Guardar venta" : "Guardar compra"}
        </button>
        {editingInvestment && (
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
