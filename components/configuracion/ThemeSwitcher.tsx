"use client";

import { useTheme } from "@/hooks/useTheme";
import { resolveEffectiveTheme } from "@/lib/theme";
import { PaletteIcon } from "@/components/shared/icons";

const OPTIONS: { value: "light" | "dark"; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

/**
 * Switch simple claro/oscuro. Antes tenía una tercera opción ("Sistema"),
 * pero el pedido fue que acá sea solo un toggle de dos — por eso el
 * activo se resuelve con `resolveEffectiveTheme` (mientras nunca se haya
 * tocado el switch, marca el que corresponda a la preferencia del
 * dispositivo, en vez de no marcar ninguno).
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const effectiveTheme = resolveEffectiveTheme(theme);

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <PaletteIcon />
        Apariencia
      </p>
      <div className="mt-2.5 flex gap-2">
        {OPTIONS.map((option) => {
          const isSelected = option.value === effectiveTheme;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold"
              style={
                isSelected
                  ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)" }
                  : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
