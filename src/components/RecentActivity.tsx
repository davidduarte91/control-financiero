import type { FinancialMovement } from "@/lib/financial-types";
import { formatCurrency, formatDate } from "@/lib/financial-format";

const movementTypeLabels: Record<FinancialMovement["type"], string> = {
  contribution: "Aporte",
  withdrawal: "Retiro",
  valuation: "Actualización de valor",
};

interface RecentActivityProps {
  movements: FinancialMovement[];
}

export function RecentActivity({ movements }: RecentActivityProps) {
  const recentMovements = movements.slice(0, 5);

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Actividad reciente</h2>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {recentMovements.map((movement) => (
          <li
            key={movement.id}
            className="grid min-w-0 gap-1 p-4 text-sm sm:grid-cols-2"
          >
            <p>Tipo: {movementTypeLabels[movement.type]}</p>
            <p>Inversión: {movement.investment}</p>
            <p>Cuenta: {movement.account}</p>
            <p>Fecha: {formatDate(movement.occurred_at)}</p>
            <p>Monto: {formatCurrency(movement.amount, movement.currency)}</p>
            <p>Moneda: {movement.currency}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
