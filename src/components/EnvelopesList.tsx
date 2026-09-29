import type { calculateEnvelopeSummaries } from "@/lib/financial-calculations";
import { formatCurrency, formatPercentage } from "@/lib/financial-format";

type EnvelopeSummary = ReturnType<typeof calculateEnvelopeSummaries>[number];

interface EnvelopesListProps {
  envelopes: EnvelopeSummary[];
}

export function EnvelopesList({ envelopes }: EnvelopesListProps) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Sobres</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {envelopes.map((envelope) => (
          <li
            key={envelope.envelope}
            className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h3 className="mb-4 break-words text-lg font-semibold">
              {envelope.envelope}
            </h3>
            <ul className="space-y-3">
              {envelope.currencySummaries.map((summary) => {
                const returnColor =
                  summary.returnAmount > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : summary.returnAmount < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-950 dark:text-zinc-50";

                return (
                  <li
                    key={summary.currency}
                    className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800"
                  >
                    <p className="mb-3 font-semibold">{summary.currency}</p>
                    <div className="space-y-2">
                      <p className="flex flex-wrap justify-between gap-2">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Capital restante
                        </span>
                        <span className="font-medium break-all">
                          {formatCurrency(
                            summary.remainingCapital,
                            summary.currency,
                          )}
                        </span>
                      </p>
                      <p className="flex flex-wrap justify-between gap-2">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Valor actual
                        </span>
                        <span className="font-medium break-all">
                          {formatCurrency(summary.currentValue, summary.currency)}
                        </span>
                      </p>
                      <p className="flex flex-wrap justify-between gap-2">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Rendimiento
                        </span>
                        <span className={`font-medium break-all ${returnColor}`}>
                          {formatCurrency(summary.returnAmount, summary.currency)}
                        </span>
                      </p>
                      <p className="flex flex-wrap justify-between gap-2">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Rendimiento %
                        </span>
                        <span className={`font-medium ${returnColor}`}>
                          {formatPercentage(summary.returnPercentage)}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
