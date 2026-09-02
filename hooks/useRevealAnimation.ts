"use client";

import { useEffect, useState } from "react";

/**
 * `false` en el primer render, `true` un frame después de montarse. Sirve
 * para animar "de 0 al valor real" con una transición CSS normal — si el
 * valor final ya estuviera puesto desde el primer render, no habría desde
 * dónde animar (barras de presupuesto, arcos de torta, etc.).
 */
export function useRevealAnimation(): boolean {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return isRevealed;
}
