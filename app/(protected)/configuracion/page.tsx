"use client";

import { useMemo, useState } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { FixedExpenseForm } from "@/components/configuracion/FixedExpenseForm";
import { FixedExpenseListItem } from "@/components/configuracion/FixedExpenseListItem";
import type { FixedExpense } from "@/lib/types";

/**
 * Configuración: por ahora solo administra las plantillas de gastos fijos
 * (alta, edición de monto/categoría/día, activar/desactivar). Las categorías
 * ya se siembran solas en el primer login (ver `seedDefaultCategoriesIfEmpty`);
 * administrarlas a mano queda para un paso futuro si hace falta.
 */
export default function ConfiguracionPage() {
  const { categories, fixedExpenses } = useRepositories();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingTemplate, setEditingTemplate] = useState<FixedExpense | null>(null);

  const expenseCategories = useMemo(
    () => categories.list().filter((category) => category.kind === "gasto"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, refreshKey]
  );
  const categoryById = useMemo(
    () => new Map(expenseCategories.map((category) => [category.id, category])),
    [expenseCategories]
  );

  const templates = useMemo(
    () => [...fixedExpenses.list()].sort((a, b) => a.day_of_month - b.day_of_month),
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

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4">
      <header>
        <h1 className="font-heading text-xl font-semibold">Configuración</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Gastos fijos
        </p>
      </header>

      <FixedExpenseForm
        expenseCategories={expenseCategories}
        editingTemplate={editingTemplate}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingTemplate(null)}
      />

      <section
        className="overflow-hidden rounded-2xl border"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        {templates.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Todavía no tenés gastos fijos configurados.
          </p>
        ) : (
          templates.map((template, index) => (
            <div key={template.id} style={{ borderTop: index === 0 ? "none" : "1px solid var(--color-border)" }}>
              <FixedExpenseListItem
                template={template}
                category={template.category_id ? categoryById.get(template.category_id) : undefined}
                onEdit={() => setEditingTemplate(template)}
                onToggleActive={() => handleToggleActive(template)}
              />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
