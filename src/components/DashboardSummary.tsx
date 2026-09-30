import type { calculateCurrencySummaries } from "@/lib/financial-calculations";
import { formatCurrency, formatPercentage } from "@/lib/financial-format";

type CurrencySummary = ReturnType<typeof calculateCurrencySummaries>[number];

interface DashboardSummaryProps {
  summaries: CurrencySummary[];
}

export function DashboardSummary({ summaries }: DashboardSummaryProps) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="financial-summary-title" className="space-y-5">
      <div className="flex items-end justify-between border-b border-surface-high/60 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Resumen clave
          </p>
          <h2
            id="financial-summary-title"
            className="mt-1 text-xl font-bold tracking-tight text-on-surface"
          >
            Resumen por moneda
          </h2>
        </div>
        <p className="text-xs text-on-surface-muted">
          Monedas presentadas por separado
        </p>
      </div>

      <div className="space-y-6">
        {summaries.map((summary) => {
          const returnTone =
            summary.returnAmount > 0
              ? "text-primary"
              : summary.returnAmount < 0
                ? "text-danger"
                : "text-on-surface";
          const percentageTone =
            summary.returnPercentage !== null && summary.returnPercentage > 0
              ? "text-primary"
              : summary.returnPercentage !== null &&
                  summary.returnPercentage < 0
                ? "text-danger"
                : "text-on-surface";

          return (
            <section
              key={summary.currency}
              aria-labelledby={`currency-${summary.currency}`}
              className="rounded-3xl border border-surface-high/70 bg-surface-container/60 p-5"
            >
              <div className="mb-4 flex items-center gap-3">
                <h3
                  id={`currency-${summary.currency}`}
                  className="font-mono text-sm font-bold tracking-wider text-primary"
                >
                  {summary.currency}
                </h3>
                <span className="h-px flex-1 bg-surface-highest/60" />
              </div>

              <div className="grid grid-cols-4 gap-5">
                <article className="min-w-0 rounded-2xl border border-primary/30 bg-surface-container p-5 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                    Capital restante
                  </p>
                  <p className="mt-4 break-words font-mono text-2xl font-bold tracking-tight text-on-surface xl:text-3xl">
                    {formatCurrency(
                      summary.remainingCapital,
                      summary.currency,
                    )}
                  </p>
                  <p className="mt-4 border-t border-surface-highest/50 pt-3 text-xs text-on-surface-muted">
                    Aportes menos retiros
                  </p>
                </article>

                <article className="min-w-0 rounded-2xl border border-surface-highest/60 bg-surface-container p-5 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                    Valor actual
                  </p>
                  <p className="mt-4 break-words font-mono text-2xl font-bold tracking-tight text-on-surface xl:text-3xl">
                    {formatCurrency(summary.currentValue, summary.currency)}
                  </p>
                  <p className="mt-4 border-t border-surface-highest/50 pt-3 text-xs text-on-surface-muted">
                    Última valuación registrada
                  </p>
                </article>

                <article className="min-w-0 rounded-2xl border border-surface-highest/60 bg-surface-container p-5 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                    Rendimiento acumulado
                  </p>
                  <p
                    className={`mt-4 break-words font-mono text-2xl font-bold tracking-tight xl:text-3xl ${returnTone}`}
                  >
                    {formatCurrency(summary.returnAmount, summary.currency)}
                  </p>
                  <p className="mt-4 border-t border-surface-highest/50 pt-3 text-xs text-on-surface-muted">
                    Valor actual menos capital
                  </p>
                </article>

                <article className="min-w-0 rounded-2xl border border-surface-highest/60 bg-surface-container p-5 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                    Rendimiento %
                  </p>
                  <p
                    className={`mt-4 break-words font-mono text-2xl font-bold tracking-tight xl:text-3xl ${percentageTone}`}
                  >
                    {formatPercentage(summary.returnPercentage)}
                  </p>
                  <p className="mt-4 border-t border-surface-highest/50 pt-3 text-xs text-on-surface-muted">
                    Sobre el capital restante
                  </p>
                </article>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
