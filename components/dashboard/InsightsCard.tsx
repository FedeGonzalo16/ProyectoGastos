import type { Insight, InsightTone } from "@/lib/aggregations/insights";

const TONE_COLOR: Record<InsightTone, string> = {
  warning: "var(--chart-2)", // naranja: llama la atención sin ser un error
  positive: "var(--color-good)",
  neutral: "var(--color-text-secondary)",
};

interface InsightsCardProps {
  insights: Insight[];
}

/**
 * Uno o dos datos destacados del mes (ver `lib/aggregations/insights.ts`).
 * No se renderiza nada si no hay ninguno — no tiene sentido una tarjeta
 * vacía diciendo que no hay nada para destacar.
 */
export function InsightsCard({ insights }: InsightsCardProps) {
  if (insights.length === 0) return null;

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div className="flex flex-col gap-2.5">
        {insights.map((insight) => (
          <div key={insight.id} className="flex items-start gap-2 text-xs leading-snug">
            <span
              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: TONE_COLOR[insight.tone] }}
            />
            {insight.message}
          </div>
        ))}
      </div>
    </section>
  );
}
