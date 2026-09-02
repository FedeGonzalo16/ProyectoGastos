interface ToastProps {
  message: string;
}

/**
 * Aviso chico y momentáneo (ej. "Gasto agregado"), flotando arriba de la
 * barra de navegación. Antes la única señal de que algo se guardó era verlo
 * aparecer en la lista de abajo — fácil de no notar. Se maneja con el hook
 * `useToast`, no se usa directo.
 */
export function Toast({ message }: ToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-22 z-50 flex justify-center px-5">
      <div
        className="chart-fade-in pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-semibold"
        style={{ background: "var(--color-text)", color: "var(--color-bg)", boxShadow: "var(--shadow-card)" }}
      >
        {message}
      </div>
    </div>
  );
}
