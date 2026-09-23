import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data, error } = await supabase
    .from("financial_movements")
    .select("*")
    .order("occurred_at", { ascending: false });

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Control financiero</h1>

      {data?.map((movement) => (
        <div key={movement.id} className="mb-4 rounded-lg border p-4">
          <p>
            <strong>Tipo:</strong> {movement.type}
          </p>

          <p>
            <strong>Inversión:</strong> {movement.investment}
          </p>

          <p>
            <strong>Cuenta:</strong> {movement.account}
          </p>

          <p>
            <strong>Sobre:</strong> {movement.envelope ?? "-"}
          </p>

          <p>
            <strong>Moneda:</strong> {movement.currency}
          </p>

          <p>
            <strong>Monto:</strong> {movement.amount}
          </p>
        </div>
      ))}
    </main>
  );
}