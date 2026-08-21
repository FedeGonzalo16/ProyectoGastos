"use client";

import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

/** Elegir tema claro/oscuro a mano, o dejar que siga la preferencia del dispositivo. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-semibold">Apariencia</p>
      <div className="mt-2.5 flex gap-2">
        {OPTIONS.map((option) => {
          const isSelected = option.value === theme;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold"
              style={
                isSelected
                  ? { background: "var(--color-brand-soft)", color: "var(--color-brand)" }
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
