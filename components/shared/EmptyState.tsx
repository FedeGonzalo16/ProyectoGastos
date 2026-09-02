interface EmptyStateProps {
  message: string;
  className?: string;
}

/**
 * Estado vacío con un poco más de carácter que un texto gris liso: un
 * ícono simple (la misma "bandeja vacía" en todos lados, a propósito — no
 * hace falta un dibujo distinto por pantalla) + el mensaje, centrado.
 */
export function EmptyState({ message, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-2.5 px-4 py-8 text-center ${className}`}>
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 13h4.5a1 1 0 0 1 .9.55l.7 1.4a1 1 0 0 0 .9.55h2a1 1 0 0 0 .9-.55l.7-1.4a1 1 0 0 1 .9-.55H20"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 13 8.2 5.6A2 2 0 0 1 10.16 4h3.68a2 2 0 0 1 1.97 1.6L17 13"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </p>
    </div>
  );
}
