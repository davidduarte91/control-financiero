import { DashboardSummary } from "@/components/DashboardSummary";
import { DashboardHeader } from "@/components/DashboardHeader";
import { EnvelopesList } from "@/components/EnvelopesList";
import { InvestmentsList } from "@/components/InvestmentsList";
import { MovementHistory } from "@/components/MovementHistory";
import { MovementModal } from "@/components/MovementModal";
import { ObjectiveExitModal } from "@/components/ObjectiveExitModal";
import { ReallocationModal } from "@/components/ReallocationModal";
import {
  calculateCurrencySummaries,
  calculatePositions,
} from "@/lib/financial-calculations";
import { getEnvelopes } from "@/lib/envelope-data";
import { getFinancialMovements } from "@/lib/financial-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [movements, envelopes] = await Promise.all([
    getFinancialMovements(),
    getEnvelopes(),
  ]);
  const currencySummaries = calculateCurrencySummaries(movements);
  const positions = calculatePositions(movements);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <DashboardHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-8 py-8">
        <section className="border-b border-surface-high/60 pb-6">
          <h1 className="text-4xl font-bold tracking-tight text-on-surface">
            Tu patrimonio, en perspectiva.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-muted">
            Resumen de tus inversiones, movimientos y objetivos financieros.
          </p>
        </section>

        <div className="space-y-10">
          <MovementModal movements={movements} envelopes={envelopes} />
          <ReallocationModal movements={movements} envelopes={envelopes} />
          <ObjectiveExitModal movements={movements} envelopes={envelopes} />
          <DashboardSummary summaries={currencySummaries} />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <EnvelopesList envelopes={envelopes} />
            <MovementHistory movements={movements} envelopes={envelopes} />
          </div>
          <InvestmentsList positions={positions} />
        </div>
      </main>
    </div>
  );
}
