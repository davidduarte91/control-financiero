"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-8 text-on-surface">
      <div className="w-full max-w-md rounded-2xl border border-danger/30 bg-surface-container p-6 shadow-xl">
        <p className="text-lg font-bold">No se pudieron cargar los datos.</p>
        <p className="mt-2 text-sm text-on-surface-muted">
          Podés volver a intentar la carga sin salir del dashboard.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:bg-[#6ffbbe]"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
