"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { renameLegacyEnvelopeAction } from "@/app/actions/financial-actions";
import type { calculateEnvelopeSummaries } from "@/lib/financial-calculations";
import { formatCurrency } from "@/lib/financial-format";
import {
  MOVEMENT_FORM_PREFILL_EVENT,
  type MovementFormPrefill,
} from "@/lib/movement-form-prefill";

type EnvelopeSummary = ReturnType<typeof calculateEnvelopeSummaries>[number];

interface EnvelopesListProps {
  envelopes: EnvelopeSummary[];
}

function normalizeEnvelopeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function getComparableEnvelopeName(value: string): string {
  return normalizeEnvelopeName(value).toLocaleLowerCase("es-AR");
}

function openMovementForm(detail: MovementFormPrefill) {
  window.dispatchEvent(
    new CustomEvent<MovementFormPrefill>(MOVEMENT_FORM_PREFILL_EVENT, {
      detail,
    }),
  );
}

export function EnvelopesList({ envelopes }: EnvelopesListProps) {
  const router = useRouter();
  const [editingEnvelope, setEditingEnvelope] = useState<string | null>(null);
  const [renamingEnvelope, setRenamingEnvelope] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRename(
    event: FormEvent<HTMLFormElement>,
    currentName: string,
  ) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const normalizedName = normalizeEnvelopeName(
      String(formData.get("envelopeName") ?? ""),
    );

    if (!normalizedName) {
      setError("El nombre del sobre es obligatorio.");
      return;
    }

    const existingEnvelope = envelopes.find(
      (envelope) =>
        envelope.envelope !== currentName &&
        getComparableEnvelopeName(envelope.envelope) ===
          getComparableEnvelopeName(normalizedName),
    );
    const canonicalName = existingEnvelope?.envelope ?? normalizedName;

    if (canonicalName === currentName) {
      setEditingEnvelope(null);
      return;
    }

    setRenamingEnvelope(currentName);

    try {
      const result = await renameLegacyEnvelopeAction(
        currentName,
        canonicalName,
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setEditingEnvelope(null);
      router.refresh();
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "No se pudo cambiar el nombre del sobre.",
      );
    } finally {
      setRenamingEnvelope(null);
    }
  }

  return (
    <section className="rounded-3xl border border-surface-high/60 bg-surface-container/60 p-5">
      <div className="mb-4 border-b border-surface-highest/50 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Objetivos
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-on-surface">
          Tus sobres
        </h2>
        <p className="mt-1 text-xs text-on-surface-muted">
          Capital acumulado por moneda
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {envelopes.length === 0 ? (
        <p className="rounded-2xl border border-surface-highest/40 bg-surface-container p-5 text-sm text-on-surface-muted">
          Todavía no hay movimientos asociados a sobres.
        </p>
      ) : (
        <ul className="space-y-3">
          {envelopes.map((envelope) => (
            <li
              key={envelope.envelope}
              className="min-w-0 rounded-2xl border border-surface-highest/50 bg-surface-container p-4 shadow-sm"
            >
              {editingEnvelope === envelope.envelope ? (
                <form
                  onSubmit={(event) =>
                    handleRename(event, envelope.envelope)
                  }
                  className="rounded-xl border border-surface-highest/40 bg-surface-lowest/60 p-3"
                >
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
                    Nombre del sobre
                    <input
                      name="envelopeName"
                      defaultValue={envelope.envelope}
                      autoFocus
                      required
                      className="mt-1.5 w-full rounded-xl border border-surface-highest bg-surface-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEnvelope(null);
                        setError(null);
                      }}
                      disabled={renamingEnvelope === envelope.envelope}
                      className="rounded-lg bg-surface-highest px-3 py-2 text-xs font-semibold text-on-surface-muted hover:text-on-surface disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={renamingEnvelope === envelope.envelope}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:opacity-60"
                    >
                      {renamingEnvelope === envelope.envelope
                        ? "Guardando..."
                        : "Guardar nombre"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="break-words text-base font-bold text-on-surface">
                      {envelope.envelope}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEnvelope(envelope.envelope);
                        setError(null);
                      }}
                      className="shrink-0 text-[11px] font-semibold text-on-surface-muted transition hover:text-on-surface"
                    >
                      Editar nombre
                    </button>
                  </div>

                  <dl className="mt-4 grid gap-2">
                    {envelope.currencySummaries.map((summary) => (
                      <div
                        key={summary.currency}
                        className="flex items-end justify-between gap-3 rounded-xl border border-surface-highest/40 bg-surface-lowest/60 px-3 py-3"
                      >
                        <dt className="rounded-md bg-surface-highest px-2 py-1 font-mono text-[11px] font-bold text-primary">
                          {summary.currency}
                        </dt>
                        <dd className="break-words text-right font-mono text-xl font-bold tracking-tight text-on-surface">
                          {formatCurrency(
                            summary.remainingCapital,
                            summary.currency,
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-surface-highest/30 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        openMovementForm({
                          type: "contribution",
                          envelope: envelope.envelope,
                        })
                      }
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary transition hover:bg-[#6ffbbe]"
                    >
                      Aportar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openMovementForm({
                          type: "withdrawal",
                          envelope: envelope.envelope,
                        })
                      }
                      className="rounded-lg bg-surface-highest px-3 py-2 text-xs font-semibold text-on-surface transition hover:bg-surface-high"
                    >
                      Extraer
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
