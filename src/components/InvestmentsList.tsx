"use client";

import type { calculatePositions } from "@/lib/financial-calculations";
import { formatCurrency, formatPercentage } from "@/lib/financial-format";
import {
  MOVEMENT_FORM_PREFILL_EVENT,
  type MovementFormPrefill,
} from "@/lib/movement-form-prefill";

type Position = ReturnType<typeof calculatePositions>[number];

interface InvestmentsListProps {
  positions: Position[];
}

function getInvestmentAbbreviation(investment: string): string {
  const words = investment.trim().split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function dispatchPrefill(detail: MovementFormPrefill) {
  window.dispatchEvent(
    new CustomEvent<MovementFormPrefill>(MOVEMENT_FORM_PREFILL_EVENT, {
      detail,
    }),
  );
}

export function InvestmentsList({ positions }: InvestmentsListProps) {
  return (
    <section className="rounded-3xl border border-surface-high/60 bg-surface-container/60 p-6">
      <div className="mb-5 border-b border-surface-highest/50 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Posiciones
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-on-surface">
          Inversiones
        </h2>
        <p className="mt-1 text-xs text-on-surface-muted">
          Capital, valuación y rendimiento de cada posición
        </p>
      </div>

      {positions.length === 0 ? (
        <p className="rounded-2xl border border-surface-highest/40 bg-surface-container p-5 text-sm text-on-surface-muted">
          Todavía no hay posiciones para mostrar.
        </p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {positions.map((position) => {
            const positionKey = JSON.stringify([
              position.investment,
              position.account,
              position.currency,
            ]);
            const returnColor =
              position.returnAmount > 0
                ? "text-primary"
                : position.returnAmount < 0
                  ? "text-danger"
                  : "text-on-surface";
            const prefillBase = {
              investment: position.investment,
              account: position.account,
              currency: position.currency,
            };

            return (
              <li
                key={positionKey}
                className="flex min-w-0 flex-col gap-4 rounded-2xl border border-surface-highest/50 bg-surface-container p-4 shadow-sm transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-surface-lowest font-mono text-sm font-bold text-primary">
                      {getInvestmentAbbreviation(position.investment)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-bold leading-tight text-on-surface">
                        {position.investment}
                      </h3>
                      <p className="mt-1 break-words text-xs text-on-surface-muted">
                        {position.account}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-surface-highest px-2.5 py-1 font-mono text-xs font-semibold text-on-surface">
                    {position.currency}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 rounded-xl border border-surface-highest/30 bg-surface-lowest/70 p-3">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
                      Capital restante
                    </dt>
                    <dd className="mt-1 break-words font-mono text-xs font-semibold text-on-surface">
                      {formatCurrency(
                        position.remainingCapital,
                        position.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
                      Valor actual
                    </dt>
                    <dd className="mt-1 break-words font-mono text-xs font-bold text-on-surface">
                      {formatCurrency(position.currentValue, position.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
                      Rendimiento
                    </dt>
                    <dd className={`mt-1 break-words font-mono text-xs font-bold ${returnColor}`}>
                      {formatCurrency(position.returnAmount, position.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
                      Rendimiento %
                    </dt>
                    <dd className={`mt-1 font-mono text-xs font-bold ${returnColor}`}>
                      {formatPercentage(position.returnPercentage)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto grid grid-cols-3 gap-2 border-t border-surface-highest/30 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      dispatchPrefill({
                        ...prefillBase,
                        type: "contribution",
                      })
                    }
                    className="rounded-lg bg-primary px-2 py-2 text-center text-xs font-bold text-on-primary transition hover:bg-[#6ffbbe]"
                  >
                    Aportar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatchPrefill({
                        ...prefillBase,
                        type: "withdrawal",
                        withdrawalKind: "capital",
                      })
                    }
                    className="rounded-lg bg-surface-highest px-2 py-2 text-center text-xs font-semibold text-on-surface transition hover:bg-surface-high"
                  >
                    Retirar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatchPrefill({
                        ...prefillBase,
                        type: "valuation",
                      })
                    }
                    className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-2 text-center text-xs font-semibold text-accent transition hover:bg-accent/20"
                  >
                    Actualizar valor
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
