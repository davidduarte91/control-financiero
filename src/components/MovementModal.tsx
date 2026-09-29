"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  createContribution,
  createValuation,
  createWithdrawal,
} from "@/lib/financial-data";
import type { FinancialMovement } from "@/lib/financial-types";

interface MovementModalProps {
  movements: FinancialMovement[];
}

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

export function MovementModal({ movements }: MovementModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (type === "valuation") {
        await createValuation(input);
      } else if (type === "withdrawal") {
        await createWithdrawal(input);
      } else {
        await createContribution(input);
      }

      form.reset();
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo registrar el aporte",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-xl font-semibold">Registrar movimiento</h2>
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 [&_input]:!ml-0 [&_input]:mt-1 [&_input]:w-full [&_input]:rounded-md [&_input]:border-zinc-300 [&_input]:bg-transparent [&_input]:px-3 [&_input]:py-2 [&_label]:grid [&_label]:gap-1 [&_label]:text-sm [&_label]:font-medium [&_select]:!ml-0 [&_select]:mt-1 [&_select]:w-full [&_select]:rounded-md [&_select]:border-zinc-300 [&_select]:bg-transparent [&_select]:px-3 [&_select]:py-2 [&_textarea]:!ml-0 [&_textarea]:mt-1 [&_textarea]:min-h-10 [&_textarea]:w-full [&_textarea]:rounded-md [&_textarea]:border-zinc-300 [&_textarea]:bg-transparent [&_textarea]:px-3 [&_textarea]:py-2 dark:[&_input]:border-zinc-700 dark:[&_select]:border-zinc-700 dark:[&_textarea]:border-zinc-700"
      >
        <label>
          Tipo
          <select name="type" className="ml-2 border">
            <option value="contribution">Aporte</option>
            <option value="withdrawal">Retiro</option>
            <option value="valuation">Actualizar valor</option>
          </select>
        </label>
        <label>
          Inversión
          <input name="investment" required className="ml-2 border" />
        </label>
        <label>
          Cuenta
          <input name="account" required className="ml-2 border" />
        </label>
        <label>
          Sobre
          <input name="envelope" className="ml-2 border" />
        </label>
        <label>
          Moneda
          <input name="currency" required className="ml-2 border" />
        </label>
        <label>
          Monto
          <input
            name="amount"
            type="number"
            step="any"
            required
            className="ml-2 border"
          />
        </label>
        <label>
          Fecha
          <input
            name="occurred_at"
            type="datetime-local"
            required
            className="ml-2 border"
          />
        </label>
        <label>
          Nota
          <textarea name="note" className="ml-2 border" />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 lg:col-span-4 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isSubmitting ? "Guardando..." : "Registrar movimiento"}
        </button>
        {error && (
          <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4 dark:text-red-400">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
