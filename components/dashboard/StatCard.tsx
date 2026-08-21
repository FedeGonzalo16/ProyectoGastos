interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  caption?: string;
}

/**
 * Tarjeta chica "etiqueta + número grande + aclaración", para el resumen del
 * Dashboard. Pensada para vivir en una grilla de 3 columnas que entre
 * entera en pantalla (no en una fila con scroll horizontal) — por eso no
 * tiene un ancho fijo, ocupa lo que le da su celda de la grilla.
 */
export function StatCard({ label, value, valueColor, caption }: StatCardProps) {
  return (
    <div
      className="min-w-0 rounded-2xl border px-3 py-3.5"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="truncate text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </p>
      <p
        className="font-heading mt-1.5 truncate text-lg font-semibold"
        style={{ color: valueColor ?? "var(--color-text)" }}
      >
        {value}
      </p>
      {caption && (
        <p className="mt-1.5 truncate text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
          {caption}
        </p>
      )}
    </div>
  );
}
