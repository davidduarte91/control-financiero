"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  deleteFinancialMovement,
  updateFinancialMovement,
} from "@/lib/financial-data";
import type { FinancialMovement } from "@/lib/financial-types";

const movementTypeLabels: Record<FinancialMovement["type"], string> = {
  contribution: "Aporte",
  withdrawal: "Retiro",
  valuation: "Actualización de valor",
};

interface MovementHistoryProps {
  movements: FinancialMovement[];
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
    const envelope = String(formData.get("envelope") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    try {
      await updateFinancialMovement(id, {
        type: String(formData.get("type")) as FinancialMovement["type"],
        investment: String(formData.get("investment")),
        account: String(formData.get("account")),
        envelope: envelope || null,
        currency: String(formData.get("currency")),
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
      <h2 className="mb-4 text-xl font-semibold">Historial de movimientos</h2>
      {error && <p>{error}</p>}
      <ul>
        {movements.map((movement) => (
          <li key={movement.id} className="mb-4">
            {editingId === movement.id ? (
              <form
                onSubmit={(event) => handleUpdate(event, movement.id)}
                className="grid gap-3"
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
                <div>
                  <button type="submit" className="border p-2">
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setError(null);
                    }}
                    className="border p-2"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>Tipo: {movementTypeLabels[movement.type]}</p>
                <p>Inversión: {movement.investment}</p>
                <p>Cuenta: {movement.account}</p>
                <p>Sobre: {movement.envelope ?? "-"}</p>
                <p>Moneda: {movement.currency}</p>
                <p>Monto: {movement.amount}</p>
                <p>Fecha: {movement.occurred_at}</p>
                <p>Nota: {movement.note ?? "-"}</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(movement.id);
                    setError(null);
                  }}
                  className="border p-2"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(movement.id)}
                  disabled={deletingId === movement.id}
                  className="border p-2"
                >
                  Eliminar
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
