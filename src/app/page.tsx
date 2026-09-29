import { DashboardSummary } from "@/components/DashboardSummary";
import { InvestmentsList } from "@/components/InvestmentsList";
import { MovementModal } from "@/components/MovementModal";
import { RecentActivity } from "@/components/RecentActivity";
import {
  calculateCurrencySummaries,
  calculatePositions,
} from "@/lib/financial-calculations";
import { getFinancialMovements } from "@/lib/financial-data";

export default async function Home() {
  const movements = await getFinancialMovements();
  const currencySummaries = calculateCurrencySummaries(movements);
  const positions = calculatePositions(movements);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Control financiero</h1>
      <MovementModal />
      <DashboardSummary summaries={currencySummaries} />
      <InvestmentsList positions={positions} />
      <RecentActivity movements={movements} />
    </main>
  );
}
