"use client";

import { useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/shared/Toast";

const TOAST_DURATION_MS = 2200;

/**
 * Aviso chico y momentáneo de confirmación (ej. "Gasto agregado"), para
 * pantallas donde guardar algo no navega a otro lado — se apaga solo. El
 * `toast` que devuelve hay que renderizarlo una vez en esa pantalla.
 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(text);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [message]);

  const toast = message ? <Toast message={message} /> : null;

  return { showToast, toast };
}
