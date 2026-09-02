"use client";

import { useState, type FormEvent } from "react";

interface AddCategoryFormProps {
  onAdd: (name: string) => void;
  /** Distingue el placeholder según la sección (Gastos/Ingresos), para que no queden dos campos idénticos en la misma pantalla. */
  placeholder: string;
}

/** Alta simple de una categoría nueva: nombre + botón, nada más. */
export function AddCategoryForm({ onAdd, placeholder }: AddCategoryFormProps) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder={placeholder}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--color-border)", background: "transparent", color: "var(--color-text)" }}
      />
      <button
        type="submit"
        className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
        style={{ background: "var(--color-brand)" }}
      >
        Agregar
      </button>
    </form>
  );
}
