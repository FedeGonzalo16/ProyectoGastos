"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRepositories } from "@/hooks/useRepositories";
import { useCurrentExchangeRate } from "@/hooks/useCurrentExchangeRate";
import { InvestmentForm } from "@/components/inversiones/InvestmentForm";
import { groupByAssetName } from "@/lib/aggregations/investmentSummary";
import type { Investment } from "@/lib/types";

/**
 * Alta/edición de una inversión en su propia pantalla — separada de
 * /inversiones, que ahora es solo para VER los datos (totales, gráficos,
 * posiciones). Mismo criterio que "Gestionar categorías": cargar algo nuevo
 * es una acción aparte, no compite visualmente con toda la información de
 * arriba. Para editar una posición existente se llega acá con `?id=...`.
 */
export default function NuevaInversionPage() {
  return (
    // `useSearchParams` necesita un límite de Suspense para no forzar
    // renderizado estático de toda la ruta — acá no importa el "loading"
    // (la página entera es chica y client-side), así que no se le pone contenido.
    <Suspense>
      <NuevaInversionForm />
    </Suspense>
  );
}

function NuevaInversionForm() {
  const router = useRouter();
  const editingId = useSearchParams().get("id");
  const { investments, investmentValuations } = useRepositories();
  // Dólar blue de hoy (DolarAPI) — se usa para autocompletar "tipo de cambio
  // del día", que si no el usuario tiene que tipearlo a mano en cada carga.
  const { rate: currentExchangeRate } = useCurrentExchangeRate();

  const allInvestments = investments.list();
  const editingInvestment = editingId ? (allInvestments.find((investment) => investment.id === editingId) ?? null) : null;

  // Posiciones netas actuales, para el picker de "qué vendo" y el tope de
  // cuánto se puede vender de cada activo — sin valuaciones acá (no hacen
  // falta, groupByAssetName no las necesita para el neto invertido, solo
  // para el % de rendimiento).
  const positions = groupByAssetName(allInvestments, []);

  function handleGoBack() {
    router.push("/inversiones");
  }

  function handleSubmit(input: Omit<Investment, "id" | "user_id" | "created_at" | "updated_at">) {
    if (editingInvestment) {
      investments.update(editingInvestment.id, input);
    } else {
      const created = investments.create(input);
      // Seed de la primera valuación: recién invertido, todavía sin
      // rendimiento — solo para una compra. Una venta es una operación ya
      // cerrada, no tiene sentido trackear su "% de rendimiento" en el tiempo.
      if (created.kind === "compra") {
        investmentValuations.create({
          investment_id: created.id,
          date: created.date,
          value_usd: created.amount_usd,
          return_percentage: 0,
          notes: null,
        });
      }
    }
    handleGoBack();
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">{editingInvestment ? "Editar inversión" : "Nueva inversión"}</h1>
      </header>

      <InvestmentForm
        onSubmit={handleSubmit}
        editingInvestment={editingInvestment}
        onCancelEdit={handleGoBack}
        positions={positions}
        currentExchangeRate={currentExchangeRate}
      />
    </div>
  );
}
