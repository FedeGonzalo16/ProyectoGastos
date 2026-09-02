interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

/**
 * Campo de búsqueda por texto libre, reusado en los listados de Gastos e
 * Ingresos (filtran por descripción). Es un componente aparte y no otro chip
 * más en `ExpenseFilters`/`IncomeList` porque no es una opción entre varias
 * como período/categoría, sino un filtro independiente que se combina con
 * cualquiera de esos.
 */
export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border px-3 py-2"
      style={{ borderColor: "var(--color-border)" }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="11" cy="11" r="7" stroke="var(--color-text-secondary)" strokeWidth="2.4" />
        <path d="M21 21l-4.3-4.3" stroke="var(--color-text-secondary)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 text-xs outline-none"
        style={{ background: "transparent", color: "var(--color-text)" }}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="shrink-0 text-sm leading-none"
          style={{ color: "var(--color-text-secondary)" }}
        >
          ×
        </button>
      )}
    </div>
  );
}
