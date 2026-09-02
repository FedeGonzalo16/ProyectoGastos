"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import { CheckIcon, PlusIcon, XIcon } from "@/components/shared/icons";

interface CategoryChipPickerProps {
  /** Todas las categorías del tipo correspondiente (activas e inactivas) — el filtrado lo hace este componente. */
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  /** Crea la categoría y la devuelve — el picker la selecciona apenas se crea. */
  onCreateCategory: (name: string) => Category;
  /** Muestra un chip "Sin categoría" al principio (útil en gastos fijos, no en la carga rápida). */
  allowNone?: boolean;
}

/**
 * Selector de categoría en formato de chips, con un botón "+" fijo al lado
 * (fuera del scroll horizontal) para crear una categoría nueva sin salir del
 * formulario. Va aparte de la fila de chips a propósito — mezclado adentro
 * del scroll se confundía con una categoría más, y si había muchas había que
 * scrollear hasta el final para encontrarlo.
 *
 * Es el mismo picker para cualquier pantalla que elija una categoría de
 * gasto o de ingreso, así "agregar una categoría nueva" funciona igual en
 * todos lados, en vez de reimplementarlo pantalla por pantalla.
 *
 * Solo muestra categorías activas — salvo la que ya está seleccionada (por
 * ejemplo, al editar un gasto viejo cuya categoría se borró después): esa se
 * sigue mostrando, marcada como inactiva, para no perder de vista qué tenía
 * asignado ni forzar a cambiarla a la fuerza.
 *
 * El chip elegido siempre se resalta en `--color-brand` (azul), no en el
 * color propio de la categoría — a propósito: ese color por categoría sigue
 * existiendo y se usa en gráficos/avatares, pero acá mezclado con muchos
 * colores distintos a la vez se sentía "ruidoso"; un solo acento consistente
 * alcanza para marcar cuál está elegido.
 */
export function CategoryChipPicker({
  categories,
  selectedId,
  onSelect,
  onCreateCategory,
  allowNone = false,
}: CategoryChipPickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const visibleCategories = categories.filter((category) => category.active || category.id === selectedId);
  // Si no hay nada más para mostrar en la fila (ni el chip "Sin categoría" ni
  // ninguna categoría), el botón "+" queda solo y flotando a la derecha con
  // todo el renglón vacío al lado — se ve raro. En ese caso se muestra un
  // botón ancho con texto en vez del círculo aislado.
  const hasNothingElseToShow = !allowNone && visibleCategories.length === 0;

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    const created = onCreateCategory(name);
    onSelect(created.id);
    setNewName("");
    setIsAdding(false);
  }

  function handleCancelAdd() {
    setNewName("");
    setIsAdding(false);
  }

  if (isAdding) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          autoFocus
          placeholder="Nombre de la categoría"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleCreate();
            }
            if (event.key === "Escape") handleCancelAdd();
          }}
          className="min-w-0 flex-1 rounded-full border px-3 py-1.5 text-xs outline-none"
          style={{ borderColor: "var(--color-brand)", background: "transparent", color: "var(--color-text)" }}
        />
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: "var(--color-brand)" }}
        >
          <CheckIcon />
          Crear
        </button>
        <button
          type="button"
          onClick={handleCancelAdd}
          aria-label="Cancelar"
          className="flex shrink-0 items-center justify-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <XIcon />
        </button>
      </div>
    );
  }

  if (hasNothingElseToShow) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-2.5 text-xs font-semibold"
        style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}
      >
        <PlusIcon />
        Nueva categoría
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="chip-scroll flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
        {allowNone && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
            style={
              selectedId === null
                ? { background: "var(--color-toggle-soft)", color: "var(--color-toggle)", border: "1.5px solid var(--color-toggle)" }
                : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
            }
          >
            Sin categoría
          </button>
        )}

        {visibleCategories.map((category) => {
          const isSelected = category.id === selectedId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
              style={
                isSelected
                  ? { background: "var(--color-brand-soft)", color: "var(--color-brand)", border: "1.5px solid var(--color-brand)" }
                  : { color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
              }
            >
              {category.name}
              {!category.active && " (inactiva)"}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        aria-label="Nueva categoría"
        title="Nueva categoría"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "var(--color-brand)" }}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
