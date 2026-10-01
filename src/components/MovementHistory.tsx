"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  deleteMovementAction,
  updateMovementAction,
} from "@/app/actions/financial-actions";
import { formatCurrency, formatDate } from "@/lib/financial-format";
import type {
  FinancialMovement,
  WithdrawalKind,
} from "@/lib/financial-types";
import { validateWithdrawalAmount } from "@/lib/financial-validation";

const movementTypeLabels: Record<FinancialMovement["type"], string> = {
  contribution: "Aporte",
  withdrawal: "Retiro",
  valuation: "Actualización de valor",
};

type MovementFilter = "all" | FinancialMovement["type"];

const movementTypeStyles: Record<
  FinancialMovement["type"],
  { badge: string; amount: string; mark: string }
> = {
  contribution: {
    badge: "bg-primary/10 text-primary",
    amount: "text-primary",
    mark: "+",
  },
  withdrawal: {
    badge: "bg-danger/10 text-danger",
    amount: "text-danger",
    mark: "−",
  },
  valuation: {
    badge: "bg-accent/10 text-accent",
    amount: "text-accent",
    mark: "~",
  },
};

const filters: Array<{ value: MovementFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "contribution", label: "Aportes" },
  { value: "withdrawal", label: "Retiros" },
  { value: "valuation", label: "Actualizaciones" },
];

const collapsedMovementCount = 3;

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
  const [activeFilter, setActiveFilter] = useState<MovementFilter>("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingType, setEditingType] =
    useState<FinancialMovement["type"]>("contribution");
  const [editingWithdrawalKind, setEditingWithdrawalKind] =
    useState<WithdrawalKind>("capital");
  const filteredMovements =
    activeFilter === "all"
      ? movements
      : movements.filter((movement) => movement.type === activeFilter);
  const visibleMovements = isExpanded
    ? filteredMovements
    : filteredMovements.slice(0, collapsedMovementCount);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);

    try {
      const result = await deleteMovementAction(id);

      if (!result.success) {
        setError(result.error);
        return;
      }

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
    const type = String(formData.get("type")) as FinancialMovement["type"];
    const amount = Number(formData.get("amount"));
    const withdrawalKind =
      type === "withdrawal" ? editingWithdrawalKind : null;
    const movementEnvelope =
      type === "withdrawal" && editingWithdrawalKind === "return"
        ? null
        : envelope || null;

    if (type === "withdrawal") {
      const originalMovement = movements.find((movement) => movement.id === id);
      const allowCapitalWithoutEnvelope =
        editingWithdrawalKind === "capital" &&
        originalMovement?.type === "withdrawal" &&
        originalMovement.withdrawal_kind !== "return" &&
        originalMovement.envelope === null &&
        movementEnvelope === null;
      const withdrawalError = validateWithdrawalAmount(
        movements.filter((movement) => movement.id !== id),
        {
          investment,
          account,
          currency,
          envelope: movementEnvelope,
          withdrawalKind: editingWithdrawalKind,
        },
        amount,
        { allowCapitalWithoutEnvelope },
      );

      if (withdrawalError) {
        setError(withdrawalError);
        return;
      }
    }

    try {
      const result = await updateMovementAction(id, {
        type,
        investment,
        account,
        envelope: movementEnvelope,
        withdrawal_kind: withdrawalKind,
        currency,
        amount,
        occurred_at: String(formData.get("occurred_at")),
        note: note || null,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

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
    <section className="rounded-3xl border border-surface-high/60 bg-surface-container/60 p-5">
      <div className="mb-4 border-b border-surface-highest/50 pb-4">
        <div className="flex items-end justify-between gap-4">
          <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Operaciones
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-on-surface">
            Actividad y movimientos
          </h2>
          <p className="mt-1 text-xs text-on-surface-muted">
            Todos los movimientos registrados
          </p>
          </div>
          <span className="rounded-lg bg-surface-highest px-2.5 py-1 font-mono text-[11px] font-semibold text-on-surface-muted">
            {filteredMovements.length} de {movements.length}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-1 rounded-xl border border-surface-high/50 bg-surface-lowest p-1">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setActiveFilter(filter.value);
                  setIsExpanded(false);
                }}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs transition ${
                  isActive
                    ? "bg-surface-highest font-semibold text-on-surface"
                    : "font-medium text-on-surface-muted hover:text-on-surface"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
        {visibleMovements.map((movement) => {
          const typeStyle = movementTypeStyles[movement.type];
          const movementSource =
            movement.type === "withdrawal"
              ? movement.withdrawal_kind === "return"
                ? "Rendimientos"
                : movement.envelope ?? "Sin sobre"
              : movement.envelope;

          return (
            <li
              key={movement.id}
              className="min-w-0 rounded-xl border border-surface-highest/40 bg-surface-container px-3.5 py-3 shadow-sm transition hover:border-surface-highest hover:bg-surface-high/40"
            >
              {editingId === movement.id ? (
                <form
                  onSubmit={(event) => handleUpdate(event, movement.id)}
                  className="grid gap-3 rounded-xl border border-surface-highest/40 bg-surface-lowest/50 p-4 sm:grid-cols-2 [&_input]:mt-1.5 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-surface-highest [&_input]:bg-surface-lowest [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_input]:text-on-surface [&_input]:outline-none [&_input]:focus:border-primary [&_input]:focus:ring-1 [&_input]:focus:ring-primary [&_label]:grid [&_label]:gap-1 [&_label]:text-[10px] [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-wider [&_label]:text-on-surface-muted [&_select]:mt-1.5 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-surface-highest [&_select]:bg-surface-lowest [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_select]:text-on-surface [&_select]:outline-none [&_select]:focus:border-primary [&_select]:focus:ring-1 [&_select]:focus:ring-primary [&_textarea]:mt-1.5 [&_textarea]:min-h-20 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-surface-highest [&_textarea]:bg-surface-lowest [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:text-on-surface [&_textarea]:outline-none [&_textarea]:focus:border-primary [&_textarea]:focus:ring-1 [&_textarea]:focus:ring-primary"
                >
                  <label>
                    Tipo
                    <select
                      name="type"
                      value={editingType}
                      onChange={(event) =>
                        setEditingType(
                          event.target.value as FinancialMovement["type"],
                        )
                      }
                    >
                      <option value="contribution">Aporte</option>
                      <option value="withdrawal">Retiro</option>
                      <option value="valuation">Actualización de valor</option>
                    </select>
                  </label>
                  {editingType === "withdrawal" && (
                    <label>
                      Origen del retiro
                      <select
                        name="withdrawal_kind"
                        value={editingWithdrawalKind}
                        onChange={(event) =>
                          setEditingWithdrawalKind(
                            event.target.value as WithdrawalKind,
                          )
                        }
                      >
                        <option value="capital">Capital de un sobre</option>
                        <option value="return">Rendimientos</option>
                      </select>
                    </label>
                  )}
                  <label>
                    Inversión
                    <input
                      name="investment"
                      defaultValue={movement.investment}
                      required
                    />
                  </label>
                  <label>
                    Cuenta
                    <input
                      name="account"
                      defaultValue={movement.account}
                      required
                    />
                  </label>
                  {!(
                    editingType === "withdrawal" &&
                    editingWithdrawalKind === "return"
                  ) && (
                    <label>
                      Sobre
                      <input
                        name="envelope"
                        defaultValue={movement.envelope ?? ""}
                        required={
                          editingType === "withdrawal" &&
                          editingWithdrawalKind === "capital" &&
                          !(
                            movement.type === "withdrawal" &&
                            movement.withdrawal_kind !== "return" &&
                            movement.envelope === null
                          )
                        }
                      />
                    </label>
                  )}
                  <label>
                    Moneda
                    <input
                      name="currency"
                      defaultValue={movement.currency}
                      required
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
                    />
                  </label>
                  <label>
                    Fecha
                    <input
                      name="occurred_at"
                      defaultValue={movement.occurred_at}
                      required
                    />
                  </label>
                  <label className="sm:col-span-2">
                    Nota
                    <textarea name="note" defaultValue={movement.note ?? ""} />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-surface-highest/40 pt-3 sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setError(null);
                      }}
                      className="rounded-lg border border-surface-highest px-4 py-2 text-xs font-medium text-on-surface-muted hover:text-on-surface"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <div
                    aria-hidden="true"
                    className={`flex size-9 items-center justify-center rounded-full font-mono text-base font-bold ${typeStyle.badge}`}
                  >
                    {typeStyle.mark}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="break-words text-sm font-semibold text-on-surface">
                        {movement.investment}
                      </p>
                      <span className={`text-[11px] font-semibold ${typeStyle.amount}`}>
                        {movementTypeLabels[movement.type]}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-xs text-on-surface-muted">
                      {formatDate(movement.occurred_at)} · {movement.account}
                      {movementSource ? ` · ${movementSource}` : ""}
                    </p>
                    {movement.note && (
                      <p className="mt-1 break-words text-xs text-on-surface-muted">
                        {movement.note}
                      </p>
                    )}
                  </div>
                  <div className="flex min-w-[124px] flex-col items-end text-right">
                    <p className={`font-mono text-sm font-bold ${typeStyle.amount}`}>
                      {formatCurrency(movement.amount, movement.currency)}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-on-surface-muted">
                      {movement.currency}
                    </p>
                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-highest/30 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(movement.id);
                          setEditingType(movement.type);
                          setEditingWithdrawalKind(
                            movement.withdrawal_kind ?? "capital",
                          );
                          setError(null);
                        }}
                        className="text-[11px] font-semibold text-on-surface-muted transition hover:text-on-surface"
                      >
                        Editar
                      </button>
                      <span aria-hidden="true" className="text-surface-highest">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(movement.id)}
                        disabled={deletingId === movement.id}
                        className="text-[11px] font-semibold text-danger transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === movement.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {filteredMovements.length > collapsedMovementCount && (
        <div className="mt-4 flex justify-center border-t border-surface-highest/40 pt-4">
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="rounded-lg border border-surface-highest px-4 py-2 text-xs font-semibold text-on-surface-muted transition hover:border-primary/50 hover:text-on-surface"
          >
            {isExpanded ? "Ver menos" : "Ver más"}
          </button>
        </div>
      )}

      {filteredMovements.length === 0 && (
        <p className="rounded-xl border border-surface-highest/40 bg-surface-container p-5 text-center text-sm text-on-surface-muted">
          No hay movimientos para este filtro.
        </p>
      )}
    </section>
  );
}
