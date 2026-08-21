/**
 * Dashboard (home). Todavía no tiene los gráficos combinados del mockup
 * (ver design/Main.dc.html) — se completa en el próximo paso del plan, una
 * vez que Mensual e Inversiones ya estén cargando datos reales.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-2 px-5 pt-6">
      <h1 className="font-heading text-xl font-semibold">Resumen</h1>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Los gráficos combinados (ingresos, gastos e inversión) se agregan en el
        próximo paso, una vez que Mensual e Inversiones ya tengan datos reales para
        mostrar.
      </p>
    </div>
  );
}
