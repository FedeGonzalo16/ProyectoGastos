import type {
  Category,
  CategoryBudget,
  Expense,
  FixedExpense,
  FixedIncome,
  Income,
  Investment,
  InvestmentGoal,
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

export function createFixedIncomesRepository(getUserId: () => string): Repository<FixedIncome> {
  return createRepository<FixedIncome>({ table: "fixed_incomes", getUserId });
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

export function createCategoryBudgetsRepository(
  getUserId: () => string
): Repository<CategoryBudget> {
  return createRepository<CategoryBudget>({ table: "category_budgets", getUserId });
}

export function createInvestmentGoalsRepository(
  getUserId: () => string
): Repository<InvestmentGoal> {
  return createRepository<InvestmentGoal>({ table: "investment_goals", getUserId });
}
