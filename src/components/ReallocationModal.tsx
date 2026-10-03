"use client";

import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent, useEffect, useState } from "react";

import { reallocateCapitalAction } from "@/app/actions/financial-actions";
import {
  calculateEnvelopePositionCapitals,
  calculatePositions,
} from "@/lib/financial-calculations";
import { formatCurrency } from "@/lib/financial-format";
import type { Envelope, FinancialMovement } from "@/lib/financial-types";
import { REALLOCATION_FORM_OPEN_EVENT } from "@/lib/movement-form-prefill";
import { validateReallocateCapitalInput } from "@/lib/financial-validation";

interface ReallocationModalProps {
  movements: FinancialMovement[];
  envelopes: Envelope[];
}

interface PositionOption {
  investment: string;
  account: string;
  currency: string;
  remainingCapital?: number;
}

const newPositionOption = "__new_position__";

function getCurrentLocalDateTime(): string {
  const now = new Date();
  const localTime = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  );

  return localTime.toISOString().slice(0, 16);
}

function getPositionKey(position: PositionOption): string {
  return JSON.stringify([position.investment, position.account]);
}

function normalizePositionName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function ReallocationModal({
  movements,
  envelopes,
}: ReallocationModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envelopeId, setEnvelopeId] = useState("");
  const [sourceKey, setSourceKey] = useState("");
  const [destinationKey, setDestinationKey] = useState("");
  const [newDestinationInvestment, setNewDestinationInvestment] = useState("");
  const [newDestinationAccount, setNewDestinationAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    function handleOpen() {
      setEnvelopeId("");
      setSourceKey("");
      setDestinationKey("");
      setNewDestinationInvestment("");
      setNewDestinationAccount("");
      setAmount("");
      setOccurredAt(getCurrentLocalDateTime());
      setNote("");
      setError(null);
      setIsOpen(true);
    }

    window.addEventListener(REALLOCATION_FORM_OPEN_EVENT, handleOpen);

    return () => {
      window.removeEventListener(REALLOCATION_FORM_OPEN_EVENT, handleOpen);
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
  const sourceOptions: PositionOption[] = selectedEnvelope
    ? calculateEnvelopePositionCapitals(movements, selectedEnvelope.id)
        .filter(
          (position) =>
            position.currency.toUpperCase() === currency &&
            position.remainingCapital > 0,
        )
        .map((position) => ({
          investment: position.investment,
          account: position.account,
          currency: position.currency,
          remainingCapital: position.remainingCapital,
        }))
    : [];
  const selectedSource =
    sourceOptions.find((position) => getPositionKey(position) === sourceKey) ??
    null;
  const destinationOptions: PositionOption[] = selectedEnvelope
    ? calculatePositions(movements)
        .filter((position) => position.currency.toUpperCase() === currency)
        .map((position) => ({
          investment: position.investment,
          account: position.account,
          currency: position.currency,
        }))
    : [];
  const selectedDestination =
    destinationOptions.find(
      (position) => getPositionKey(position) === destinationKey,
    ) ?? null;
  const isNewDestination = destinationKey === newPositionOption;
  const destinationInvestment = isNewDestination
    ? newDestinationInvestment.trim().replace(/\s+/g, " ")
    : selectedDestination?.investment ?? "";
  const destinationAccount = isNewDestination
    ? normalizePositionName(newDestinationAccount)
    : selectedDestination?.account ?? "";
  const destinationIsSource =
    selectedSource !== null &&
    normalizePositionName(destinationInvestment) === selectedSource.investment &&
    normalizePositionName(destinationAccount) === selectedSource.account;
  const parsedAmount = Number(amount);
  const amountExceedsSource =
    selectedSource !== null &&
    amount !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > selectedSource.remainingCapital!;
  const sourcePositionsForLists = [
    ...new Set(sourceOptions.map((position) => position.investment)),
  ];
  const accountOptions = [
    ...new Set(destinationOptions.map((position) => position.account)),
  ];

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
      sourceInvestment: selectedSource?.investment ?? "",
      sourceAccount: selectedSource?.account ?? "",
      destinationInvestment,
      destinationAccount,
      currency,
      amount: parsedAmount,
      occurredAt,
      note: note.trim() || null,
    };
    const validationError = validateReallocateCapitalInput(input);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (amountExceedsSource) {
      setError("El monto supera el capital disponible en la posición de origen.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);

    try {
      const result = await reallocateCapitalAction(formData);

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
          : "No se pudo redistribuir el capital.",
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
        aria-labelledby="reallocation-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-surface-high bg-surface-container shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-surface-highest/60 bg-surface-high px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Operación
            </p>
            <h2
              id="reallocation-modal-title"
              className="mt-1 text-lg font-bold tracking-tight text-on-surface"
            >
              Redistribuir capital
            </h2>
            <p className="mt-1 text-xs text-on-surface-muted">
              Mové capital entre posiciones sin cambiar el saldo del sobre
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
            name="sourceInvestment"
            value={selectedSource?.investment ?? ""}
          />
          <input
            type="hidden"
            name="sourceAccount"
            value={selectedSource?.account ?? ""}
          />
          <input
            type="hidden"
            name="destinationInvestment"
            value={destinationInvestment}
          />
          <input
            type="hidden"
            name="destinationAccount"
            value={destinationAccount}
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
                  setDestinationKey("");
                  setNewDestinationInvestment("");
                  setNewDestinationAccount("");
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

            <label className={labelClass}>
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
                <option value="">Seleccionar origen</option>
                {sourceOptions.map((position) => (
                  <option
                    key={getPositionKey(position)}
                    value={getPositionKey(position)}
                  >
                    {position.investment} / {position.account} —{" "}
                    {formatCurrency(position.remainingCapital!, currency)}
                  </option>
                ))}
              </select>
              {selectedEnvelope && sourceOptions.length === 0 && (
                <span className="mt-1 block text-xs normal-case text-on-surface-muted">
                  Este sobre no tiene capital disponible en posiciones.
                </span>
              )}
            </label>

            <label className={labelClass}>
              Posición destino
              <select
                value={destinationKey}
                onChange={(event) => {
                  setDestinationKey(event.target.value);
                  setError(null);
                }}
                required
                disabled={!selectedEnvelope}
                className={fieldClass}
              >
                <option value="">Seleccionar destino</option>
                {destinationOptions.map((position) => (
                  <option
                    key={getPositionKey(position)}
                    value={getPositionKey(position)}
                  >
                    {position.investment} / {position.account}
                  </option>
                ))}
                <option value={newPositionOption}>Nueva combinación…</option>
              </select>
              {destinationIsSource && (
                <span className="mt-1 block text-xs normal-case text-danger">
                  El origen y el destino no pueden ser iguales.
                </span>
              )}
            </label>

            {isNewDestination && (
              <>
                <label className={labelClass}>
                  Nueva inversión
                  <input
                    list="reallocation-investments"
                    value={newDestinationInvestment}
                    onChange={(event) =>
                      setNewDestinationInvestment(event.target.value)
                    }
                    required
                    className={fieldClass}
                  />
                  <datalist id="reallocation-investments">
                    {sourcePositionsForLists.map((investment) => (
                      <option key={investment} value={investment} />
                    ))}
                  </datalist>
                </label>
                <label className={labelClass}>
                  Nueva cuenta
                  <input
                    list="reallocation-accounts"
                    value={newDestinationAccount}
                    onChange={(event) =>
                      setNewDestinationAccount(event.target.value)
                    }
                    required
                    className={fieldClass}
                  />
                  <datalist id="reallocation-accounts">
                    {accountOptions.map((account) => (
                      <option key={account} value={account} />
                    ))}
                  </datalist>
                </label>
              </>
            )}

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
              {selectedSource && (
                <span className="mt-1 block text-xs normal-case text-on-surface-muted">
                  Disponible:{" "}
                  {formatCurrency(selectedSource.remainingCapital!, currency)}
                </span>
              )}
              {amountExceedsSource && (
                <span className="mt-1 block text-xs normal-case text-danger">
                  El monto supera el capital disponible en el origen.
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
                amountExceedsSource ||
                !selectedSource ||
                destinationIsSource ||
                !destinationInvestment ||
                !destinationAccount
              }
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-[0_4px_16px_rgba(78,222,163,0.2)] transition hover:bg-[#6ffbbe] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Redistribuyendo..." : "Redistribuir capital"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
