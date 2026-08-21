"use client";

import { useEffect, useState } from "react";
import { getStoredTheme, setStoredTheme, type ThemePreference } from "@/lib/theme";

/** Expone la preferencia de tema actual y una forma de cambiarla, ya aplicada al documento. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>("system");

  // El valor guardado solo se puede leer en el navegador. Se sincroniza en
  // un efecto (no en el `useState` inicial) a propósito, para que el primer
  // render del cliente coincida con el HTML que vino del servidor y no haya
  // un warning de hidratación — el "costo" es este único re-render extra,
  // que es exactamente para lo que existe este patrón.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(getStoredTheme());
  }, []);

  function setTheme(next: ThemePreference) {
    setStoredTheme(next);
    setThemeState(next);
  }

  return { theme, setTheme };
}
