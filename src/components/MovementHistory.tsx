"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  deleteFinancialMovement,
  updateFinancialMovement,
} from "@/lib/financial-data";
import { formatCurrency, formatDate } from "@/lib/financial-format";
import type { FinancialMovement } from "@/lib/financial-types";

const movementTypeLabels: Record<FinancialMovement["type"], string> = {
  contribution: "Aporte",
  withdrawal: "Retiro",
  valuation: "Actualización de valor",
};

interface MovementHistoryProps {
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

export function MovementHistory({ movements }: MovementHistoryProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);

    try {
      await deleteFinancialMovement(id);
      router.refresh();
    } catch (deletionError) {
      setError(
        deletionError instanceof Error
          ? deletionError.message
          : "No se pudo eliminar el movimiento",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
    id: string,
  ) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
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
    const note = String(formData.get("note") ?? "").trim();

    try {
      await updateFinancialMovement(id, {
        type: String(formData.get("type")) as FinancialMovement["type"],
        investment,
        account,
        envelope: envelope || null,
        currency,
        amount: Number(formData.get("amount")),
        occurred_at: String(formData.get("occurred_at")),
        note: note || null,
      });

      setEditingId(null);
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar el movimiento",
      );
    }
  }

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Historial de movimientos</h2>
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <ul className="space-y-4">
        {movements.map((movement) => (
          <li
            key={movement.id}
            className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            {editingId === movement.id ? (
              <form
                onSubmit={(event) => handleUpdate(event, movement.id)}
                className="grid gap-4 sm:grid-cols-2 [&_input]:!ml-0 [&_input]:mt-1 [&_input]:w-full [&_input]:rounded-md [&_input]:border-zinc-300 [&_input]:bg-transparent [&_input]:px-3 [&_input]:py-2 [&_label]:grid [&_label]:gap-1 [&_label]:text-sm [&_label]:font-medium [&_select]:!ml-0 [&_select]:mt-1 [&_select]:w-full [&_select]:rounded-md [&_select]:border-zinc-300 [&_select]:bg-transparent [&_select]:px-3 [&_select]:py-2 [&_textarea]:!ml-0 [&_textarea]:mt-1 [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:rounded-md [&_textarea]:border-zinc-300 [&_textarea]:bg-transparent [&_textarea]:px-3 [&_textarea]:py-2 dark:[&_input]:border-zinc-700 dark:[&_select]:border-zinc-700 dark:[&_textarea]:border-zinc-700"
              >
                <label>
                  Tipo
                  <select
                    name="type"
                    defaultValue={movement.type}
                    className="ml-2 border"
                  >
                    <option value="contribution">Aporte</option>
                    <option value="withdrawal">Retiro</option>
                    <option value="valuation">Actualización de valor</option>
                  </select>
                </label>
                <label>
                  Inversión
                  <input
                    name="investment"
                    defaultValue={movement.investment}
                    required
                    className="ml-2 border"
                  />
                </label>
                <label>
                  Cuenta
                  <input
                    name="account"
                    defaultValue={movement.account}
                    required
                    className="ml-2 border"
                  />
                </label>
                <label>
                  Sobre
                  <input
                    name="envelope"
                    defaultValue={movement.envelope ?? ""}
                    className="ml-2 border"
                  />
                </label>
                <label>
                  Moneda
                  <input
                    name="currency"
                    defaultValue={movement.currency}
                    required
                    className="ml-2 border"
                  />
                </label>
                <label>
                  Monto
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    defaultValue={movement.amount}
                    required
                    className="ml-2 border"
                  />
                </label>
                <label>
                  Fecha
                  <input
                    name="occurred_at"
                    defaultValue={movement.occurred_at}
                    required
                    className="ml-2 border"
                  />
                </label>
                <label>
                  Nota
                  <textarea
                    name="note"
                    defaultValue={movement.note ?? ""}
                    className="ml-2 border"
                  />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setError(null);
                    }}
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>Tipo: {movementTypeLabels[movement.type]}</p>
                <p>Inversión: {movement.investment}</p>
                <p>Cuenta: {movement.account}</p>
                <p>Sobre: {movement.envelope ?? "-"}</p>
                <p>Moneda: {movement.currency}</p>
                <p>
                  Monto: {formatCurrency(movement.amount, movement.currency)}
                </p>
                <p>Fecha: {formatDate(movement.occurred_at)}</p>
                <p>Nota: {movement.note ?? "-"}</p>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(movement.id);
                      setError(null);
                    }}
                    className="rounded-md border border-zinc-300 px-4 py-2 font-medium dark:border-zinc-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(movement.id)}
                    disabled={deletingId === movement.id}
                    className="rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
