"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ManageLink } from "@/components/shared/ManageLink";
import { EmptyState } from "@/components/shared/EmptyState";
import { FixedIncomeForm } from "@/components/ingresos-fijos/FixedIncomeForm";
import { FixedIncomeListItem } from "@/components/ingresos-fijos/FixedIncomeListItem";
import type { FixedIncome } from "@/lib/types";

/**
 * Administración de las plantillas de ingresos fijos (alta, edición de
 * monto/día, activar/desactivar) — mismo criterio que Gastos fijos: vive
 * fuera de Configuración porque es parte del flujo de Mensual (de ahí se
 * llega acá), no un ajuste general de la app.
 */
export default function IngresosFijosPage() {
  const { fixedIncomes } = useRepositories();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingTemplate, setEditingTemplate] = useState<FixedIncome | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const templates = useMemo(
    // Las que no tienen día fijo (null) van al final de la lista, no se
    // mezclan con un día 1 "real" que sí eligió alguien.
    () => [...fixedIncomes.list()].sort((a, b) => (a.day_of_month ?? Infinity) - (b.day_of_month ?? Infinity)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fixedIncomes, refreshKey]
  );

  function handleSubmit(input: Omit<FixedIncome, "id" | "user_id" | "created_at" | "updated_at">) {
    if (editingTemplate) {
      fixedIncomes.update(editingTemplate.id, input);
      setEditingTemplate(null);
    } else {
      fixedIncomes.create(input);
    }
    setRefreshKey((key) => key + 1);
  }

  function handleToggleActive(template: FixedIncome) {
    fixedIncomes.update(template.id, { active: !template.active });
    setRefreshKey((key) => key + 1);
  }

  async function handleDeleteTemplate(template: FixedIncome) {
    // Borra la plantilla para siempre (a diferencia de "Desactivar", que la
    // pausa pero se puede reactivar). Los ingresos ya generados en meses
    // anteriores no se tocan — solo deja de generarse de ahí en adelante.
    const confirmed = await confirm(
      `¿Borrar "${template.name}" para siempre? Los ingresos ya generados en meses anteriores no se borran, pero no se va a generar más.`,
      { confirmLabel: "Borrar", variant: "danger" }
    );
    if (!confirmed) return;

    fixedIncomes.remove(template.id);
    if (editingTemplate?.id === template.id) setEditingTemplate(null);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Ingresos fijos</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Se generan solos cada mes en Mensual
        </p>
      </header>

      <FixedIncomeForm
        editingTemplate={editingTemplate}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingTemplate(null)}
      />

      <ManageLink href="/mensual" className="-mt-2">
        Categorizar ingresos generados en Mensual →
      </ManageLink>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        {templates.length === 0 ? (
          <EmptyState message="Todavía no tenés ingresos fijos configurados." />
        ) : (
          templates.map((template, index) => (
            <div key={template.id} style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}>
              <FixedIncomeListItem
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
