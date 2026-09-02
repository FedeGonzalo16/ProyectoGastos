import { formatYearMonth, type YearMonth } from "@/lib/dateRange";
import { formatArs } from "@/lib/format";

interface CreditCardOutlookCardProps {
  months: YearMonth[];
  amountsByMonth: number[];
}

/**
 * Cuánto ya está comprometido con tarjeta de crédito para este mes y los que
 * vienen — suma los gastos con `payment_method: "credito"` ya cargados,
 * incluidas las cuotas futuras generadas al comprar en cuotas (ver
 * `lib/repository/planInstallments.ts`). Vive en el Dashboard, no en
 * Mensual, porque no está atado a un mes puntual: es una proyección hacia
 * adelante, no el resumen de "este mes".
 */
export function CreditCardOutlookCard({ months, amountsByMonth }: CreditCardOutlookCardProps) {
  return (
    <section className="rounded-2xl border p-5" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
      <h2 className="text-sm font-semibold">Próximos vencimientos de tarjeta</h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Lo que ya está cargado con crédito, cuotas futuras incluidas
      </p>
      <div className="mt-3.5 flex flex-col gap-2">
        {months.map((month, index) => (
          <div key={`${month.year}-${month.month}`} className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--color-text-secondary)" }}>{formatYearMonth(month)}</span>
            <span className="font-semibold tabular-nums">{formatArs(amountsByMonth[index] ?? 0)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
