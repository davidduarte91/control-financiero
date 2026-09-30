export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-8 text-on-surface">
      <div className="rounded-2xl border border-surface-high bg-surface-container px-6 py-5 shadow-xl">
        <p className="text-sm font-semibold">Cargando datos...</p>
        <p className="mt-1 text-xs text-on-surface-muted">
          Preparando tu información financiera.
        </p>
      </div>
    </main>
  );
}
