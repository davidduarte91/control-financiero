"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  createContribution,
  createValuation,
  createWithdrawal,
} from "@/lib/financial-data";

export function MovementModal() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const type = String(formData.get("type"));
    const envelope = String(formData.get("envelope") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const input = {
      investment: String(formData.get("investment")),
      account: String(formData.get("account")),
      envelope: envelope || null,
      currency: String(formData.get("currency")),
      amount: Number(formData.get("amount")),
      occurred_at: String(formData.get("occurred_at")),
      note: note || null,
    };

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
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold">Registrar movimiento</h2>
      <form onSubmit={handleSubmit} className="grid gap-3">
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
        <button type="submit" disabled={isSubmitting} className="border p-2">
          {isSubmitting ? "Guardando..." : "Registrar movimiento"}
        </button>
        {error && <p>{error}</p>}
      </form>
    </section>
  );
}
