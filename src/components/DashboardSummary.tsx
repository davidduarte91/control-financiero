import type { calculateCurrencySummaries } from "@/lib/financial-calculations";

type CurrencySummary = ReturnType<typeof calculateCurrencySummaries>[number];

interface DashboardSummaryProps {
  summaries: CurrencySummary[];
}

export function DashboardSummary({ summaries }: DashboardSummaryProps) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold">Resumen por moneda</h2>
      <ul>
        {summaries.map((summary) => (
          <li key={summary.currency} className="mb-4">
            <p>Moneda: {summary.currency}</p>
            <p>Capital restante: {summary.remainingCapital}</p>
            <p>Valor actual: {summary.currentValue}</p>
            <p>Rendimiento: {summary.returnAmount}</p>
            <p>Rendimiento %: {summary.returnPercentage ?? "-"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
