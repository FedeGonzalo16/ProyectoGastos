/**
 * Inversiones — pendiente (siguiente paso del plan). Ver
 * design/Inversiones.dc.html para el layout ya aprobado.
 */
export default function InversionesPage() {
  return (
    <div className="flex flex-col gap-2 px-5 pt-6">
      <h1 className="font-heading text-xl font-semibold">Inversiones</h1>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Próximo paso: alta de posiciones (con nombre/ticker propio), conversión
        ARS→USD, distribución por activo y evolución del rendimiento.
      </p>
    </div>
  );
}
