"use client";

import { useMemo } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  createCategoriesRepository,
  createExpensesRepository,
  createFixedExpensesRepository,
  createIncomesRepository,
  createInvestmentValuationsRepository,
  createInvestmentsRepository,
} from "@/lib/repository/entities";

/**
 * Punto de entrada único para que las pantallas obtengan sus repositorios,
 * ya atados al usuario logueado actual. Evita que cada componente tenga que
 * repetir el `getUserId` y mantiene a los componentes sin conocer nada de
 * Supabase ni de localStorage.
 */
export function useRepositories() {
  const { user } = useAuth();

  // Si todavía no cargó la sesión, no debería llamarse a create()/update() —
  // esta función solo se lanza cuando de verdad hace falta un id.
  const getUserId = () => {
    if (!user) throw new Error("No hay un usuario logueado.");
    return user.id;
  };

  return useMemo(
    () => ({
      categories: createCategoriesRepository(getUserId),
      fixedExpenses: createFixedExpensesRepository(getUserId),
      expenses: createExpensesRepository(getUserId),
      incomes: createIncomesRepository(getUserId),
      investments: createInvestmentsRepository(getUserId),
      investmentValuations: createInvestmentValuationsRepository(getUserId),
    }),
    // Se recrean si cambia el usuario (ej. logout + login con otra cuenta).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id]
  );
}
