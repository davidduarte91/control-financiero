"use client";

import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent, useEffect, useState } from "react";

import {
  createContributionAction,
  createValuationAction,
  createWithdrawalAction,
} from "@/app/actions/financial-actions";
import type { FinancialMovement } from "@/lib/financial-types";
import { validateWithdrawalAmount } from "@/lib/financial-validation";
import {
  MOVEMENT_FORM_OPEN_EVENT,
  MOVEMENT_FORM_PREFILL_EVENT,
  type MovementFormPrefill,
} from "@/lib/movement-form-prefill";

interface MovementModalProps {
  movements: FinancialMovement[];
}

const movementTypes: Array<{
  value: FinancialMovement["type"];
  label: string;
  activeClass: string;
}> = [
  {
    value: "contribution",
    label: "Aporte (+)",
    activeClass: "bg-primary text-on-primary",
  },
  {
    value: "withdrawal",
    label: "Retiro (−)",
    activeClass: "bg-danger text-[#40000d]",
  },
  {
    value: "valuation",
    label: "Actualizar (~)",
    activeClass: "bg-accent text-[#00354a]",
  },
];

function findExistingSpelling(
  value: string,
  existingValues: Array<string | null>,
): string {
  const comparableValue = value.toLocaleLowerCase("es-AR");
  const existingValue = existingValues.find(
    (candidate) =>
      candidate !== null &&
      candidate
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("es-AR") === comparableValue,
  );

  return existingValue ?? value;
}

function normalizeSuggestionValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");
}

function getUniqueCanonicalValues(
  values: Array<string | null>,
): string[] {
  const valuesByKey = new Map<string, string>();

  for (const value of values) {
    if (value === null) {
      continue;
    }

    const canonicalValue = value.trim().replace(/\s+/g, " ");
    const key = normalizeSuggestionValue(canonicalValue);

    if (key && !valuesByKey.has(key)) {
      valuesByKey.set(key, canonicalValue);
    }
  }

  return [...valuesByKey.values()];
}

export function MovementModal({ movements }: MovementModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<MovementFormPrefill | null>(null);
  const [movementType, setMovementType] =
    useState<FinancialMovement["type"]>("contribution");
  const [formVersion, setFormVersion] = useState(0);
  const [selectedInvestment, setSelectedInvestment] = useState("");

  useEffect(() => {
    function handleOpen() {
      setPrefill(null);
      setMovementType("contribution");
      setSelectedInvestment("");
      setFormVersion((version) => version + 1);
      setError(null);
      setIsOpen(true);
    }

    function handlePrefill(event: Event) {
      const { detail } = event as CustomEvent<MovementFormPrefill>;
      setPrefill(detail);
      setMovementType(detail.type);
      setSelectedInvestment(detail.investment ?? "");
      setFormVersion((version) => version + 1);
      setError(null);
      setIsOpen(true);
    }

    window.addEventListener(MOVEMENT_FORM_OPEN_EVENT, handleOpen);
    window.addEventListener(MOVEMENT_FORM_PREFILL_EVENT, handlePrefill);

    return () => {
      window.removeEventListener(MOVEMENT_FORM_OPEN_EVENT, handleOpen);
      window.removeEventListener(MOVEMENT_FORM_PREFILL_EVENT, handlePrefill);
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

    const form = event.currentTarget;
    const formData = new FormData(form);
    const type = String(formData.get("type"));
    const normalizedInvestment = String(formData.get("investment") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const normalizedAccount = String(formData.get("account") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const normalizedEnvelope = String(formData.get("envelope") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const investment = findExistingSpelling(
      normalizedInvestment,
      movements.map((movement) => movement.investment),
    );
    const account = findExistingSpelling(
      normalizedAccount,
      movements.map((movement) => movement.account),
    );
    const envelope = normalizedEnvelope
      ? findExistingSpelling(
          normalizedEnvelope,
          movements.map((movement) => movement.envelope),
        )
      : "";
    const currency = String(formData.get("currency") ?? "")
      .trim()
      .toUpperCase();
    const amount = Number(formData.get("amount"));
    const occurredAt = String(formData.get("occurred_at") ?? "");
    const note = String(formData.get("note") ?? "").trim();

    if (!investment) {
      setError("La inversión es obligatoria");
      return;
    }

    if (!account) {
      setError("La cuenta es obligatoria");
      return;
    }

    if (!currency) {
      setError("La moneda es obligatoria");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto debe ser mayor que 0");
      return;
    }

    if (!occurredAt) {
      setError("La fecha es obligatoria");
      return;
    }

    if (type === "withdrawal") {
      const withdrawalError = validateWithdrawalAmount(
        movements,
        {
          investment,
          account,
          currency,
        },
        amount,
      );

      if (withdrawalError) {
        setError(withdrawalError);
        return;
      }
    }

    const input = {
      investment,
      account,
      envelope: envelope || null,
      currency,
      amount,
      occurred_at: occurredAt,
      note: note || null,
    };

    setIsSubmitting(true);

    try {
      const result = type === "valuation"
        ? await createValuationAction(input)
        : type === "withdrawal"
          ? await createWithdrawalAction(input)
          : await createContributionAction(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      form.reset();
      setPrefill(null);
      setMovementType("contribution");
      setSelectedInvestment("");
      setFormVersion((version) => version + 1);
      setIsOpen(false);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo registrar el movimiento",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-surface-highest bg-surface-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition placeholder:text-on-surface-muted/60 focus:border-primary focus:ring-1 focus:ring-primary";
  const labelClass =
    "text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted";
  const investmentOptions = getUniqueCanonicalValues(
    movements.map((movement) => movement.investment),
  );
  const selectedInvestmentKey = normalizeSuggestionValue(selectedInvestment);
  const associatedMovements = selectedInvestmentKey
    ? movements.filter(
        (movement) =>
          normalizeSuggestionValue(movement.investment) ===
          selectedInvestmentKey,
      )
    : [];
  const accountOptions = getUniqueCanonicalValues([
    ...associatedMovements.map((movement) => movement.account),
    ...movements.map((movement) => movement.account),
  ]);
  const envelopeOptions = getUniqueCanonicalValues([
    ...associatedMovements.map((movement) => movement.envelope),
    ...movements.map((movement) => movement.envelope),
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-lowest/80 p-6 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-surface-high bg-surface-container shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-surface-highest/60 bg-surface-high px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Operación
            </p>
            <h2
              id="movement-modal-title"
              className="mt-1 text-lg font-bold tracking-tight text-on-surface"
            >
              Registrar movimiento
            </h2>
            <p className="mt-1 text-xs text-on-surface-muted">
              Actualizá tus posiciones con un movimiento real
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

        <form
          key={formVersion}
          onSubmit={handleSubmit}
          className="overflow-y-auto p-6"
        >
          <input type="hidden" name="type" value={movementType} />

          <fieldset>
            <legend className={labelClass}>Tipo de movimiento</legend>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-surface-lowest p-1">
              {movementTypes.map((type) => {
                const isActive = movementType === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setMovementType(type.value)}
                    className={`rounded-lg px-3 py-2 text-xs transition ${
                      isActive
                        ? `${type.activeClass} font-bold`
                        : "font-medium text-on-surface-muted hover:text-on-surface"
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <label className={labelClass}>
              Inversión
              <input
                name="investment"
                list="movement-investments"
                defaultValue={prefill?.investment ?? ""}
                onChange={(event) => setSelectedInvestment(event.target.value)}
                autoFocus
                required
                className={fieldClass}
              />
              <datalist id="movement-investments">
                {investmentOptions.map((investment) => (
                  <option key={investment} value={investment} />
                ))}
              </datalist>
            </label>
            <label className={labelClass}>
              Cuenta / plataforma
              <input
                name="account"
                list="movement-accounts"
                defaultValue={prefill?.account ?? ""}
                required
                className={fieldClass}
              />
              <datalist id="movement-accounts">
                {accountOptions.map((account) => (
                  <option key={account} value={account} />
                ))}
              </datalist>
            </label>
            <label className={labelClass}>
              Sobre
              <input
                name="envelope"
                list="movement-envelopes"
                defaultValue={prefill?.envelope ?? ""}
                className={fieldClass}
              />
              <datalist id="movement-envelopes">
                {envelopeOptions.map((envelope) => (
                  <option key={envelope} value={envelope} />
                ))}
              </datalist>
            </label>
            <label className={labelClass}>
              Moneda
              <input
                name="currency"
                defaultValue={prefill?.currency ?? ""}
                required
                className={`${fieldClass} font-mono`}
              />
            </label>
            <label className={labelClass}>
              Monto / valor
              <input
                name="amount"
                type="number"
                step="any"
                required
                className={`${fieldClass} font-mono`}
              />
            </label>
            <label className={labelClass}>
              Fecha
              <input
                name="occurred_at"
                type="datetime-local"
                required
                className={fieldClass}
              />
            </label>
            <label className={`col-span-2 ${labelClass}`}>
              Nota
              <textarea
                name="note"
                className={`${fieldClass} min-h-20 resize-y`}
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
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-[0_4px_16px_rgba(78,222,163,0.2)] transition hover:bg-[#6ffbbe] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Guardando..." : "Guardar movimiento"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
