import type { FinancialMovement } from "@/lib/financial-types";

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
      <h2 className="mb-4 text-xl font-semibold">Actividad reciente</h2>
      <ul>
        {recentMovements.map((movement) => (
          <li key={movement.id} className="mb-4">
            <p>Tipo: {movementTypeLabels[movement.type]}</p>
            <p>Inversión: {movement.investment}</p>
            <p>Cuenta: {movement.account}</p>
            <p>Fecha: {movement.occurred_at}</p>
            <p>Monto: {movement.amount}</p>
            <p>Moneda: {movement.currency}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
