import type {
  Category,
  Expense,
  FixedExpense,
  Income,
  Investment,
  InvestmentValuation,
} from "@/lib/types";
import { createRepository } from "@/lib/repository/createRepository";
import type { Repository } from "@/lib/repository/types";

/**
 * Un repositorio por entidad, cada uno atado a su tabla y su tipo.
 * Son funciones cortas a propósito: lo único que hacen es decirle a la
 * fábrica genérica (`createRepository`) qué tabla y qué tipo usar — toda la
 * lógica real vive en un solo lugar.
 */

export function createCategoriesRepository(getUserId: () => string): Repository<Category> {
  return createRepository<Category>({ table: "categories", getUserId });
}

export function createFixedExpensesRepository(
  getUserId: () => string
): Repository<FixedExpense> {
  return createRepository<FixedExpense>({ table: "fixed_expenses", getUserId });
}

export function createExpensesRepository(getUserId: () => string): Repository<Expense> {
  return createRepository<Expense>({ table: "expenses", getUserId });
}

export function createIncomesRepository(getUserId: () => string): Repository<Income> {
  return createRepository<Income>({ table: "incomes", getUserId });
}

export function createInvestmentsRepository(getUserId: () => string): Repository<Investment> {
  return createRepository<Investment>({ table: "investments", getUserId });
}

export function createInvestmentValuationsRepository(
  getUserId: () => string
): Repository<InvestmentValuation> {
  return createRepository<InvestmentValuation>({
    table: "investment_valuations",
    getUserId,
  });
}
