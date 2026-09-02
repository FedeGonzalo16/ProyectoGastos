import type { AssetType } from "@/lib/types";

/**
 * Fuente única de los labels de tipo de activo — la usan el formulario de
 * carga, el Historial, los filtros y las agrupaciones (`investmentSummary.ts`),
 * para que agregar un tipo nuevo (ej. Cedear/Bono) sea un solo lugar, no
 * cuatro copias sueltas.
 */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cripto: "Cripto",
  etf: "ETF",
  cedear: "Cedear",
  bono: "Bono",
  moneda: "Moneda",
  otro: "Otro",
};

/** Mismo orden en que se muestran los chips en toda la app (no es el orden de color — ver `ASSET_TYPE_ORDER` en `investmentSummary.ts`, que está fijo aparte para no correr colores ya asignados). */
export const ASSET_TYPES: { value: AssetType; label: string }[] = (Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map(
  (value) => ({ value, label: ASSET_TYPE_LABELS[value] })
);
