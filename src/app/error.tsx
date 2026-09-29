"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorProps) {
  return (
    <main>
      <p>No se pudieron cargar los datos.</p>
      <button type="button" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
