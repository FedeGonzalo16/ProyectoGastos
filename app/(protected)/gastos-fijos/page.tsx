"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ManageLink } from "@/components/shared/ManageLink";
import { EmptyState } from "@/components/shared/EmptyState";
import { FixedExpenseForm } from "@/components/gastos-fijos/FixedExpenseForm";
import { FixedExpenseListItem } from "@/components/gastos-fijos/FixedExpenseListItem";
import type { FixedExpense } from "@/lib/types";

/**
 * Administración de las plantillas de gastos fijos (alta, edición de
 * monto/día, activar/desactivar). Vive fuera de Configuración a propósito:
 * es parte del flujo de Mensual (de ahí se llega acá), no un ajuste general
 * de la app.
 */
export default function GastosFijosPage() {
  const { fixedExpenses } = useRepositories();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingTemplate, setEditingTemplate] = useState<FixedExpense | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const templates = useMemo(
    // Las que no tienen día fijo (null) van al final de la lista, no se
    // mezclan con un día 1 "real" que sí eligió alguien.
    () => [...fixedExpenses.list()].sort((a, b) => (a.day_of_month ?? Infinity) - (b.day_of_month ?? Infinity)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fixedExpenses, refreshKey]
  );

  function handleSubmit(input: Omit<FixedExpense, "id" | "user_id" | "created_at" | "updated_at">) {
    if (editingTemplate) {
      fixedExpenses.update(editingTemplate.id, input);
      setEditingTemplate(null);
    } else {
      fixedExpenses.create(input);
    }
    setRefreshKey((key) => key + 1);
  }

  function handleToggleActive(template: FixedExpense) {
    fixedExpenses.update(template.id, { active: !template.active });
    setRefreshKey((key) => key + 1);
  }

  async function handleDeleteTemplate(template: FixedExpense) {
    // Borra la plantilla para siempre (a diferencia de "Desactivar", que la
    // pausa pero se puede reactivar). Los gastos ya generados en meses
    // anteriores no se tocan — solo deja de generarse de ahí en adelante.
    const confirmed = await confirm(
      `¿Borrar "${template.name}" para siempre? Los gastos ya generados en meses anteriores no se borran, pero no se va a generar más.`,
      { confirmLabel: "Borrar", variant: "danger" }
    );
    if (!confirmed) return;

    fixedExpenses.remove(template.id);
    if (editingTemplate?.id === template.id) setEditingTemplate(null);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Gastos fijos</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Se generan solos cada mes en Mensual
        </p>
      </header>

      <FixedExpenseForm
        editingTemplate={editingTemplate}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingTemplate(null)}
      />

      <ManageLink href="/gastos" className="-mt-2">
        Categorizar gastos generados en Gastos →
      </ManageLink>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        {templates.length === 0 ? (
          <EmptyState message="Todavía no tenés gastos fijos configurados." />
        ) : (
          templates.map((template, index) => (
            <div key={template.id} style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}>
              <FixedExpenseListItem
                template={template}
                onEdit={() => setEditingTemplate(template)}
                onToggleActive={() => handleToggleActive(template)}
                onDelete={() => handleDeleteTemplate(template)}
              />
            </div>
          ))
        )}
      </section>

      {dialog}
    </div>
  );
}
