import type { calculatePositions } from "@/lib/financial-calculations";
import { formatCurrency, formatPercentage } from "@/lib/financial-format";

type Position = ReturnType<typeof calculatePositions>[number];

interface InvestmentsListProps {
  positions: Position[];
}

export function InvestmentsList({ positions }: InvestmentsListProps) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Inversiones</h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {positions.map((position) => (
          <li
            key={JSON.stringify([
              position.investment,
              position.account,
              position.currency,
              position.envelope,
            ])}
            className="min-w-0 space-y-2 rounded-xl border border-zinc-200 bg-white p-5 text-sm shadow-sm [&>p:first-child]:text-base [&>p:first-child]:font-semibold dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p>Inversión: {position.investment}</p>
            <p>Cuenta: {position.account}</p>
            <p>Sobre: {position.envelope ?? "-"}</p>
            <p>Moneda: {position.currency}</p>
            <p className="font-medium">
              Capital restante:{" "}
              {formatCurrency(position.remainingCapital, position.currency)}
            </p>
            <p className="font-medium">
              Valor actual: {formatCurrency(position.currentValue, position.currency)}
            </p>
            <p
              className={
                position.returnAmount > 0
                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                  : position.returnAmount < 0
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "font-medium"
              }
            >
              Rendimiento: {formatCurrency(position.returnAmount, position.currency)}
            </p>
            <p
              className={
                position.returnAmount > 0
                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                  : position.returnAmount < 0
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "font-medium"
              }
            >
              Rendimiento %: {formatPercentage(position.returnPercentage)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
