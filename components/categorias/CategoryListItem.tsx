"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import type { CategoryDeletionMode } from "@/lib/repository/deleteCategory";
import { categoricalColorVar } from "@/lib/charts/categoricalColor";
import { PencilIcon, TrashIcon } from "@/components/shared/icons";

interface CategoryListItemProps {
  category: Category;
  colorIndex: number;
  /** Si ya es la primera/última de su tipo, no tiene sentido ofrecer subir/bajar en esa dirección. */
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (name: string) => void;
  onDelete: (mode: CategoryDeletionMode) => void;
}

/**
 * Una fila de categoría: el nombre se convierte en un input al tocar
 * "Renombrar" (se guarda al confirmar, no en cada tecla); "Borrar" no borra
 * directo — despliega la elección de qué hacer con lo que ya está cargado
 * con esta categoría, porque no hay una respuesta obvia por defecto. Las
 * flechas ↑/↓ reordenan a mano dentro de su propio tipo (gasto/ingreso) — se
 * usan botones simples en vez de arrastrar y soltar porque funcionan igual de
 * bien con el dedo (mobile) que con el mouse (desktop).
 */
export function CategoryListItem({
  category,
  colorIndex,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
}: CategoryListItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const [isChoosingDeleteMode, setIsChoosingDeleteMode] = useState(false);

  function handleConfirmRename() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== category.name) onRename(trimmed);
    setIsRenaming(false);
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {!isRenaming && !isChoosingDeleteMode && (
          <div className="flex shrink-0 flex-col gap-0.5 text-[9px] leading-none">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label="Subir"
              style={{ color: canMoveUp ? "var(--color-text-secondary)" : "var(--color-border)" }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label="Bajar"
              style={{ color: canMoveDown ? "var(--color-text-secondary)" : "var(--color-border)" }}
            >
              ▼
            </button>
          </div>
        )}
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoricalColorVar(colorIndex) }} />

        {isRenaming ? (
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={handleConfirmRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleConfirmRename();
              }
              if (event.key === "Escape") {
                setName(category.name);
                setIsRenaming(false);
              }
            }}
            className="flex-1 rounded-lg border px-2 py-1 text-sm outline-none"
            style={{ borderColor: "var(--color-brand)", background: "transparent", color: "var(--color-text)" }}
          />
        ) : (
          <span className="flex-1 text-sm">{category.name}</span>
        )}

        {!isRenaming && !isChoosingDeleteMode && (
          <>
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: "var(--color-brand)" }}
            >
              <PencilIcon />
              Renombrar
            </button>
            <button
              type="button"
              onClick={() => setIsChoosingDeleteMode(true)}
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: "var(--chart-8)" }}
            >
              <TrashIcon />
              Borrar
            </button>
          </>
        )}
      </div>

      {isChoosingDeleteMode && (
        <div className="mt-2.5 rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}>
          <p className="text-[11.5px]" style={{ color: "var(--color-text-secondary)" }}>
            Deja de poder elegirse para cargar algo nuevo. ¿Qué hacemos con lo que ya tiene &quot;{category.name}&quot;?
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onDelete("keep-on-existing")}
              className="rounded-lg px-3 py-2 text-left text-[11.5px] font-semibold"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            >
              Mantenerla en lo ya cargado
            </button>
            <button
              type="button"
              onClick={() => onDelete("clear-existing")}
              className="rounded-lg px-3 py-2 text-left text-[11.5px] font-semibold"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            >
              Dejarlo sin categoría
            </button>
            <button
              type="button"
              onClick={() => setIsChoosingDeleteMode(false)}
              className="rounded-lg px-3 py-2 text-left text-[11.5px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
