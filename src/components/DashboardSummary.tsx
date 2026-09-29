import type { calculateCurrencySummaries } from "@/lib/financial-calculations";
import { formatCurrency, formatPercentage } from "@/lib/financial-format";

type CurrencySummary = ReturnType<typeof calculateCurrencySummaries>[number];

interface DashboardSummaryProps {
  summaries: CurrencySummary[];
}

export function DashboardSummary({ summaries }: DashboardSummaryProps) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Resumen por moneda</h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaries.map((summary) => (
          <li
            key={summary.currency}
            className="h-full min-w-0 space-y-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-lg font-semibold">{summary.currency}</p>
            <p className="break-words text-sm">
              Capital restante:{" "}
              {formatCurrency(summary.remainingCapital, summary.currency)}
            </p>
            <p className="break-words text-sm">
              Valor actual: {formatCurrency(summary.currentValue, summary.currency)}
            </p>
            <p className="break-words text-sm">
              Rendimiento: {formatCurrency(summary.returnAmount, summary.currency)}
            </p>
            <p className="text-sm">
              Rendimiento %: {formatPercentage(summary.returnPercentage)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
