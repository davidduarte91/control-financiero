"use server";

import { revalidatePath } from "next/cache";

import {
  createContribution,
  createValuation,
  createWithdrawal,
  deleteFinancialMovement,
  getFinancialMovements,
  renameEnvelope,
  updateFinancialMovement,
  type CreateMovementInput,
} from "@/lib/financial-data";
import type { FinancialMovement } from "@/lib/financial-types";
import { validateWithdrawalAmount } from "@/lib/financial-validation";

export type FinancialActionResult =
  | { success: true }
  | { success: false; error: string };

type MovementActionInput = Omit<CreateMovementInput, "type">;

const movementTypes: FinancialMovement["type"][] = [
  "contribution",
  "withdrawal",
  "valuation",
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function findExistingSpelling(
  value: string,
  existingValues: Array<string | null>,
): string {
  const comparableValue = value.toLocaleLowerCase("es-AR");
  const existingValue = existingValues.find(
    (candidate) =>
      candidate !== null &&
      normalizeText(candidate).toLocaleLowerCase("es-AR") === comparableValue,
  );

  return existingValue ?? value;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function validateAndNormalizeMovementInput(
  input: MovementActionInput,
): Promise<{ input: MovementActionInput; movements: FinancialMovement[] }> {
  const normalizedInvestment = normalizeText(input.investment);
  const normalizedAccount = normalizeText(input.account);
  const normalizedEnvelope = input.envelope
    ? normalizeText(input.envelope)
    : "";
  const currency = normalizeText(input.currency).toUpperCase();
  const occurredAt = normalizeText(input.occurred_at);
  const note = input.note ? input.note.trim() : null;

  if (!normalizedInvestment) {
    throw new Error("La inversión es obligatoria");
  }

  if (!normalizedAccount) {
    throw new Error("La cuenta es obligatoria");
  }

  if (!currency) {
    throw new Error("La moneda es obligatoria");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("El monto debe ser mayor que 0");
  }

  if (!occurredAt) {
    throw new Error("La fecha es obligatoria");
  }

  const movements = await getFinancialMovements();
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
    : null;

  return {
    input: {
      investment,
      account,
      envelope,
      currency,
      amount: input.amount,
      occurred_at: occurredAt,
      note: note || null,
    },
    movements,
  };
}

async function createMovementAction(
  type: FinancialMovement["type"],
  input: MovementActionInput,
): Promise<FinancialActionResult> {
  try {
    const validated = await validateAndNormalizeMovementInput(input);

    if (type === "withdrawal") {
      const withdrawalError = validateWithdrawalAmount(
        validated.movements,
        {
          investment: validated.input.investment,
          account: validated.input.account,
          envelope: validated.input.envelope,
          currency: validated.input.currency,
        },
        validated.input.amount,
      );

      if (withdrawalError) {
        return { success: false, error: withdrawalError };
      }
    }

    if (type === "contribution") {
      await createContribution(validated.input);
    } else if (type === "withdrawal") {
      await createWithdrawal(validated.input);
    } else {
      await createValuation(validated.input);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "No se pudo registrar el movimiento"),
    };
  }
}

export async function createContributionAction(
  input: MovementActionInput,
): Promise<FinancialActionResult> {
  return createMovementAction("contribution", input);
}

export async function createWithdrawalAction(
  input: MovementActionInput,
): Promise<FinancialActionResult> {
  return createMovementAction("withdrawal", input);
}

export async function createValuationAction(
  input: MovementActionInput,
): Promise<FinancialActionResult> {
  return createMovementAction("valuation", input);
}

export async function updateMovementAction(
  id: string,
  input: CreateMovementInput,
): Promise<FinancialActionResult> {
  try {
    if (!id.trim()) {
      throw new Error("El movimiento es inválido");
    }

    if (!movementTypes.includes(input.type)) {
      throw new Error("El tipo de movimiento es inválido");
    }

    const validated = await validateAndNormalizeMovementInput(input);

    if (input.type === "withdrawal") {
      const withdrawalError = validateWithdrawalAmount(
        validated.movements.filter((movement) => movement.id !== id),
        {
          investment: validated.input.investment,
          account: validated.input.account,
          envelope: validated.input.envelope,
          currency: validated.input.currency,
        },
        validated.input.amount,
      );

      if (withdrawalError) {
        return { success: false, error: withdrawalError };
      }
    }

    await updateFinancialMovement(id, {
      ...validated.input,
      type: input.type,
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "No se pudo actualizar el movimiento"),
    };
  }
}

export async function deleteMovementAction(
  id: string,
): Promise<FinancialActionResult> {
  try {
    if (!id.trim()) {
      throw new Error("El movimiento es inválido");
    }

    await deleteFinancialMovement(id);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "No se pudo eliminar el movimiento"),
    };
  }
}

export async function renameLegacyEnvelopeAction(
  currentName: string,
  newName: string,
): Promise<FinancialActionResult> {
  try {
    const normalizedCurrentName = normalizeText(currentName);
    const normalizedNewName = normalizeText(newName);

    if (!normalizedCurrentName || !normalizedNewName) {
      throw new Error("El nombre del sobre es obligatorio.");
    }

    await renameEnvelope(currentName, normalizedNewName);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "No se pudo cambiar el nombre del sobre."),
    };
  }
}
