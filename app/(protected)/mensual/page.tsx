/**
 * Resumen mensual — pendiente (siguiente paso del plan). Ver
 * design/Mensual.dc.html para el layout ya aprobado.
 */
export default function MensualPage() {
  return (
    <div className="flex flex-col gap-2 px-5 pt-6">
      <h1 className="font-heading text-xl font-semibold">Resumen mensual</h1>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Próximo paso: ingresos categorizados, gastos fijos vs. variables y la
        comparativa contra meses anteriores.
      </p>
    </div>
  );
}
