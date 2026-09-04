"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/shared/icons";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Clases del `<label>` contenedor (margen entre campos + tamaño de texto) — cada formulario ya tenía su propio criterio, se pasa tal cual en vez de fijarlo acá. */
  labelClassName: string;
}

/**
 * Campo de contraseña con un botón de "ver/ocultar" (ícono de ojo) — mismo
 * componente para login, registro, cambiar contraseña y resetear
 * contraseña, para no repetir el toggle en cada formulario por separado. El
 * estado de "se ve o no" es propio de cada campo (no hace falta que el
 * formulario que lo usa sepa nada de esto).
 */
export function PasswordField({ label, value, onChange, labelClassName }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className={labelClassName} style={{ color: "var(--color-text-secondary)" }}>
      {label}
      <div className="relative mt-1">
        <input
          type={isVisible ? "text" : "password"}
          required
          minLength={6}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border py-2 pr-10 pl-3 text-sm outline-none"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "transparent" }}
        />
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex items-center px-3"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}
