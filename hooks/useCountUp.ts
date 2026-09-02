"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima un número desde el valor anterior (0 la primera vez) hasta `target`,
 * en vez de que la cifra aparezca de golpe — puramente cosmético, el valor
 * real ya está calculado en otro lado, esto solo interpola cómo se muestra.
 * Sirve para las cifras "hero" (balance del mes, total invertido, etc.).
 */
export function useCountUp(target: number, durationMs = 800): number {
  const [displayValue, setDisplayValue] = useState(0);
  const previousTarget = useRef(0);

  useEffect(() => {
    const from = previousTarget.current;
    if (from === target) return;

    const startTime = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = Math.min(1, (now - startTime) / durationMs);
      // Ease-out cúbico: arranca rápido y frena suave al llegar al valor final.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + (target - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        // Recién se "confirma" el valor de arranque para la próxima vez
        // cuando la animación termina de verdad — si se marcara al empezar,
        // el doble efecto de React Strict Mode en desarrollo (monta, limpia,
        // vuelve a montar) cancelaba la animación real pero dejaba
        // `previousTarget` ya actualizado, y la segunda pasada creía que no
        // había nada que animar (por eso el número quedaba pegado en $0).
        previousTarget.current = target;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return displayValue;
}
