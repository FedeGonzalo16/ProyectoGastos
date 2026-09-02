import { formatUsd } from "@/lib/format";

export type InvestmentGoalAlertKind = "investment_goal_reached";

export interface InvestmentGoalAlertCandidate {
  userId: string;
  kind: InvestmentGoalAlertKind;
  /** Siempre "goal" — a lo sumo hay una meta de inversión por usuario. */
  entityId: string;
  /** "YYYY-MM" — si se vuelve a cumplir el mes que viene, avisa de nuevo. */
  period: string;
  title: string;
  body: string;
}

/**
 * Para UN usuario: si tiene un mínimo mensual de inversión definido y ya lo
 * alcanzó este mes, arma el aviso — positivo, una sola vez por mes. A
 * diferencia de `buildInvestmentGoalInsight` (que avisa mientras TODAVÍA no
 * se cumplió, para mostrarlo en el dashboard), acá es al revés: no tiene
 * sentido un push insistiendo en algo que todavía no pasó, así que solo
 * notifica cuando se cumple.
 */
export function collectInvestmentGoalAlerts(
  userId: string,
  targetUsd: number | null,
  contributedUsd: number,
  period: string
): InvestmentGoalAlertCandidate[] {
  if (targetUsd === null || targetUsd <= 0) return [];
  if (contributedUsd < targetUsd) return [];

  return [
    {
      userId,
      kind: "investment_goal_reached",
      entityId: "goal",
      period,
      title: "¡Meta de inversión cumplida!",
      body: `Ya llegaste a tu mínimo mensual de inversión: aportaste ${formatUsd(contributedUsd)} de ${formatUsd(targetUsd)}.`,
    },
  ];
}
