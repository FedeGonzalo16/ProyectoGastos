interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  caption?: string;
}

/** Tarjeta chica "etiqueta + número grande + aclaración", para el resumen del Dashboard. */
export function StatCard({ label, value, valueColor, caption }: StatCardProps) {
  return (
    <div
      className="flex-[0_0_152px] rounded-2xl border px-4 py-3.5"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </p>
      <p className="font-heading mt-1.5 text-[21px] font-semibold" style={{ color: valueColor ?? "var(--color-text)" }}>
        {value}
      </p>
      {caption && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {caption}
        </p>
      )}
    </div>
  );
}
