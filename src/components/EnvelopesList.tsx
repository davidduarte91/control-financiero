"use client";

import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent, useEffect, useState } from "react";

import { createEnvelopeAction } from "@/app/actions/envelope-actions";
import { formatCurrency } from "@/lib/financial-format";
import type { Envelope } from "@/lib/financial-types";

interface EnvelopesListProps {
  envelopes: Envelope[];
}

export function EnvelopesList({ envelopes }: EnvelopesListProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCreating) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setIsCreating(false);
        setError(null);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCreating, isSubmitting]);

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsCreating(false);
    setError(null);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);

    try {
      const result = await createEnvelopeAction({
        name: String(formData.get("name") ?? ""),
        currency: String(formData.get("currency") ?? ""),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      form.reset();
      setIsCreating(false);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo crear el sobre.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-surface-highest bg-surface-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition placeholder:text-on-surface-muted/60 focus:border-primary focus:ring-1 focus:ring-primary";
  const labelClass =
    "text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted";

  return (
    <>
      <section className="rounded-3xl border border-surface-high/60 bg-surface-container/60 p-5">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-surface-highest/50 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Objetivos
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-on-surface">
              Tus sobres
            </h2>
            <p className="mt-1 text-xs text-on-surface-muted">
              Saldo asignado por moneda
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsCreating(true);
            }}
            className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary transition hover:bg-[#6ffbbe]"
          >
            + Crear sobre
          </button>
        </div>

        {envelopes.length === 0 ? (
          <p className="rounded-2xl border border-surface-highest/40 bg-surface-container p-5 text-sm text-on-surface-muted">
            Todavía no hay sobres activos.
          </p>
        ) : (
          <ul className="space-y-3">
            {envelopes.map((envelope) => (
              <li
                key={envelope.id}
                className="min-w-0 rounded-2xl border border-surface-highest/50 bg-surface-container p-4 shadow-sm"
              >
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-bold text-on-surface">
                      {envelope.name}
                    </h3>
                    <span className="mt-2 inline-flex rounded-md bg-surface-highest px-2 py-1 font-mono text-[11px] font-bold text-primary">
                      {envelope.currency}
                    </span>
                  </div>
                  <p className="break-words text-right font-mono text-xl font-bold tracking-tight text-on-surface">
                    {formatCurrency(envelope.balance, envelope.currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-lowest/80 p-6 backdrop-blur-sm"
          onMouseDown={handleBackdropClick}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-envelope-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-surface-high bg-surface-container shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-surface-highest/60 bg-surface-high px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Objetivo
                </p>
                <h2
                  id="create-envelope-title"
                  className="mt-1 text-lg font-bold tracking-tight text-on-surface"
                >
                  Crear sobre
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar modal"
                onClick={closeModal}
                disabled={isSubmitting}
                className="flex size-9 items-center justify-center rounded-xl bg-surface-highest text-xl text-on-surface-muted transition hover:text-on-surface disabled:opacity-50"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <label className={`col-span-2 ${labelClass}`}>
                  Nombre
                  <input
                    name="name"
                    autoFocus
                    required
                    className={fieldClass}
                  />
                </label>
                <label className={`col-span-2 ${labelClass}`}>
                  Moneda
                  <input
                    name="currency"
                    required
                    className={`${fieldClass} font-mono uppercase`}
                  />
                </label>
              </div>

              {error && (
                <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                  {error}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t border-surface-highest/50 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-xl bg-surface-highest px-5 py-2.5 text-sm font-semibold text-on-surface-muted transition hover:text-on-surface disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition hover:bg-[#6ffbbe] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
