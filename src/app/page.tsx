import { DashboardSummary } from "@/components/DashboardSummary";
import { EnvelopesList } from "@/components/EnvelopesList";
import { InvestmentsList } from "@/components/InvestmentsList";
import { MovementHistory } from "@/components/MovementHistory";
import { MovementModal } from "@/components/MovementModal";
import { RecentActivity } from "@/components/RecentActivity";
import {
  calculateCurrencySummaries,
  calculateEnvelopeSummaries,
  calculatePositions,
} from "@/lib/financial-calculations";
import { getFinancialMovements } from "@/lib/financial-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const movements = await getFinancialMovements();
  const currencySummaries = calculateCurrencySummaries(movements);
  const envelopeSummaries = calculateEnvelopeSummaries(movements);
  const positions = calculatePositions(movements);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Control financiero
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Resumen de tus inversiones y objetivos
          </p>
        </header>
        <div className="space-y-10">
          <MovementModal movements={movements} />
          <DashboardSummary summaries={currencySummaries} />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <EnvelopesList envelopes={envelopeSummaries} />
            <RecentActivity movements={movements} />
          </div>
          <InvestmentsList positions={positions} />
          <MovementHistory movements={movements} />
        </div>
      </div>
    </main>
  );
}
