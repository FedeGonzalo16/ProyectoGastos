/**
 * Preferencia de tema (claro/oscuro/según el sistema), guardada en el propio
 * dispositivo — no es un dato de la app (no vive en Supabase ni se
 * sincroniza), así que localStorage directo alcanza y sobra.
 */

export type ThemePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "gastosapp:theme";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isValidTheme(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** Lee la preferencia guardada, o "system" si nunca se eligió ninguna. */
export function getStoredTheme(): ThemePreference {
  if (!isBrowser()) return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isValidTheme(stored) ? stored : "system";
}

/**
 * Aplica el tema al documento: "system" borra el atributo (así manda
 * `prefers-color-scheme`, ver app/globals.css); "light"/"dark" lo fuerzan
 * sin importar la preferencia del sistema operativo.
 */
export function applyTheme(theme: ThemePreference): void {
  if (!isBrowser()) return;

  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function setStoredTheme(theme: ThemePreference): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

/**
 * Script mínimo que se inyecta en el `<head>` (ver app/layout.tsx) y corre
 * ANTES de que React hidrate la página: sin esto, se vería un flash del
 * tema equivocado (el de `prefers-color-scheme`) durante un instante cada
 * vez que alguien eligió explícitamente claro u oscuro.
 */
export const APPLY_STORED_THEME_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (error) {}
})();
`;
