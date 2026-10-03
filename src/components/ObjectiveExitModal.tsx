"use client";

import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent, useEffect, useState } from "react";

import { withdrawObjectiveCapitalAction } from "@/app/actions/financial-actions";
import {
  calculateEnvelopePositionCapitals,
  calculateObjectiveExitAvailableCapital,
} from "@/lib/financial-calculations";
import { formatCurrency } from "@/lib/financial-format";
import type { Envelope, FinancialMovement } from "@/lib/financial-types";
import { OBJECTIVE_EXIT_FORM_OPEN_EVENT } from "@/lib/movement-form-prefill";
import { validateWithdrawObjectiveCapitalInput } from "@/lib/financial-validation";

interface ObjectiveExitModalProps {
  movements: FinancialMovement[];
  envelopes: Envelope[];
}

interface SourcePosition {
  investment: string;
  account: string;
  currency: string;
  remainingCapital: number;
}

function getCurrentLocalDateTime(): string {
  const now = new Date();
  const localTime = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  );

  return localTime.toISOString().slice(0, 16);
}

function getPositionKey(position: SourcePosition): string {
  return JSON.stringify([position.investment, position.account]);
}

export function ObjectiveExitModal({
  movements,
  envelopes,
}: ObjectiveExitModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envelopeId, setEnvelopeId] = useState("");
  const [sourceKey, setSourceKey] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    function handleOpen() {
      setEnvelopeId("");
      setSourceKey("");
      setAmount("");
      setOccurredAt(getCurrentLocalDateTime());
      setNote("");
      setError(null);
      setIsOpen(true);
    }

    window.addEventListener(OBJECTIVE_EXIT_FORM_OPEN_EVENT, handleOpen);

    return () => {
      window.removeEventListener(OBJECTIVE_EXIT_FORM_OPEN_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setIsOpen(false);
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
  }, [isOpen, isSubmitting]);

  const selectedEnvelope =
    envelopes.find((envelope) => envelope.id === envelopeId) ?? null;
  const currency = selectedEnvelope?.currency.toUpperCase() ?? "";
  const sourceOptions: SourcePosition[] = selectedEnvelope
    ? calculateEnvelopePositionCapitals(movements, selectedEnvelope.id)
        .filter(
          (position) =>
            position.currency.toUpperCase() === currency &&
            position.remainingCapital > 0,
        )
    : [];
  const selectedSource =
    sourceOptions.find((position) => getPositionKey(position) === sourceKey) ??
    null;
  const parsedAmount = Number(amount);
  const amountExceedsPosition =
    selectedSource !== null &&
    amount !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > selectedSource.remainingCapital;
  const amountExceedsEnvelope =
    selectedEnvelope !== null &&
    amount !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > selectedEnvelope.balance;
  const maximumAmount =
    selectedSource && selectedEnvelope
      ? calculateObjectiveExitAvailableCapital(
          selectedSource.remainingCapital,
          selectedEnvelope.balance,
        )
      : 0;

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
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

    const input = {
      envelopeId,
      investment: selectedSource?.investment ?? "",
      account: selectedSource?.account ?? "",
      currency,
      amount: parsedAmount,
      occurredAt,
      note: note.trim() || null,
    };
    const validationError = validateWithdrawObjectiveCapitalInput(input);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (amountExceedsPosition) {
      setError("El monto supera el capital disponible en esta posición.");
      return;
    }

    if (amountExceedsEnvelope) {
      setError("El monto supera el saldo disponible del sobre.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);

    try {
      const result = await withdrawObjectiveCapitalAction(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo retirar capital del objetivo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-surface-highest bg-surface-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";
  const labelClass =
    "text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-lowest/80 p-6 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="objective-exit-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-surface-high bg-surface-container shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-surface-highest/60 bg-surface-high px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">
              Operación
            </p>
            <h2
              id="objective-exit-modal-title"
              className="mt-1 text-lg font-bold tracking-tight text-on-surface"
            >
              Retirar capital del objetivo
            </h2>
            <p className="mt-1 text-xs text-on-surface-muted">
              El capital sale de la inversión y del saldo del sobre
            </p>
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

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
          <input type="hidden" name="currency" value={currency} />
          <input
            type="hidden"
            name="investment"
            value={selectedSource?.investment ?? ""}
          />
          <input
            type="hidden"
            name="account"
            value={selectedSource?.account ?? ""}
          />

          <div className="grid grid-cols-2 gap-4">
            <label className={`col-span-2 ${labelClass}`}>
              Sobre
              <select
                name="envelopeId"
                value={envelopeId}
                onChange={(event) => {
                  setEnvelopeId(event.target.value);
                  setSourceKey("");
                  setError(null);
                }}
                required
                className={fieldClass}
              >
                <option value="">Seleccionar sobre</option>
                {envelopes.map((envelope) => (
                  <option key={envelope.id} value={envelope.id}>
                    {envelope.name} — {envelope.currency}
                  </option>
                ))}
              </select>
              {selectedEnvelope && (
                <span className="mt-1 block font-mono text-xs normal-case">
                  Moneda de la operación: {currency}
                </span>
              )}
            </label>

            <label className={`col-span-2 ${labelClass}`}>
              Posición origen
              <select
                value={sourceKey}
                onChange={(event) => {
                  setSourceKey(event.target.value);
                  setError(null);
                }}
                required
                disabled={!selectedEnvelope}
                className={fieldClass}
              >
                <option value="">Seleccionar posición</option>
                {sourceOptions.map((position) => (
                  <option
                    key={getPositionKey(position)}
                    value={getPositionKey(position)}
                  >
                    {position.investment} / {position.account} —{" "}
                    {formatCurrency(position.remainingCapital, currency)}
                  </option>
                ))}
              </select>
              {selectedEnvelope && sourceOptions.length === 0 && (
                <span className="mt-1 block text-xs normal-case text-on-surface-muted">
                  Este sobre no tiene capital disponible en posiciones.
                </span>
              )}
              {selectedSource && (
                <span className="mt-1 block text-xs normal-case text-on-surface-muted">
                  Capital atribuible:{" "}
                  {formatCurrency(selectedSource.remainingCapital, currency)}
                </span>
              )}
            </label>

            <label className={labelClass}>
              Monto ({currency || "moneda"})
              <input
                name="amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className={`${fieldClass} font-mono`}
              />
              {selectedEnvelope && (
                <span className="mt-1 block text-xs normal-case text-on-surface-muted">
                  Saldo del sobre:{" "}
                  {formatCurrency(selectedEnvelope.balance, currency)}
                  {selectedSource && (
                    <>
                      {" "}
                      · Máximo para retirar:{" "}
                      {formatCurrency(maximumAmount, currency)}
                    </>
                  )}
                </span>
              )}
              {amountExceedsPosition && (
                <span className="mt-1 block text-xs normal-case text-danger">
                  El monto supera el capital disponible en esta posición.
                </span>
              )}
              {amountExceedsEnvelope && (
                <span className="mt-1 block text-xs normal-case text-danger">
                  El monto supera el saldo disponible del sobre.
                </span>
              )}
            </label>

            <label className={labelClass}>
              Fecha
              <input
                name="occurredAt"
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                required
                className={fieldClass}
              />
            </label>

            <label className={`col-span-2 ${labelClass}`}>
              Nota (opcional)
              <textarea
                name="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={`${fieldClass} min-h-20 resize-y`}
              />
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
            >
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
              disabled={
                isSubmitting ||
                !selectedSource ||
                amountExceedsPosition ||
                amountExceedsEnvelope
              }
              className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-[#40000d] transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Retirando..." : "Retirar capital"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
