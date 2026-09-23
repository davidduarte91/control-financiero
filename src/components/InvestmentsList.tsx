import type { calculatePositions } from "@/lib/financial-calculations";

type Position = ReturnType<typeof calculatePositions>[number];

interface InvestmentsListProps {
  positions: Position[];
}

export function InvestmentsList({ positions }: InvestmentsListProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">Inversiones</h2>
      <ul>
        {positions.map((position) => (
          <li
            key={JSON.stringify([
              position.investment,
              position.account,
              position.currency,
              position.envelope,
            ])}
            className="mb-4"
          >
            <p>Inversión: {position.investment}</p>
            <p>Cuenta: {position.account}</p>
            <p>Sobre: {position.envelope ?? "-"}</p>
            <p>Moneda: {position.currency}</p>
            <p>Capital restante: {position.remainingCapital}</p>
            <p>Valor actual: {position.currentValue}</p>
            <p>Rendimiento: {position.returnAmount}</p>
            <p>Rendimiento %: {position.returnPercentage ?? "-"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
