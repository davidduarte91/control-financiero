"use server";

import { revalidatePath } from "next/cache";

import { getEnvelopeById } from "@/lib/envelope-data";
import {
  createValuation,
  createWithdrawal,
  deleteFinancialMovement,
  getFinancialMovementById,
  getFinancialMovements,
  reallocateCapital,
  registerNewCapital,
  renameEnvelope,
  revertNewCapital,
  updateFinancialMovement,
  type CreateMovementInput,
} from "@/lib/financial-data";
import type { FinancialMovement } from "@/lib/financial-types";
import {
  getMovementDeletionMode,
  validateReallocateCapitalInput,
  validateWithdrawalAmount,
} from "@/lib/financial-validation";
import {
  MOVEMENT_ENVELOPE_NOT_FOUND_ERROR,
  movementRequiresEnvelope,
  resolveMovementEnvelope,
} from "@/lib/movement-envelope";

export type FinancialActionResult =
  | { success: true; operationId?: string }
  | { success: false; error: string };

type MovementActionInput = Omit<CreateMovementInput, "type" | "envelope">;
type UpdateMovementActionInput = Omit<CreateMovementInput, "envelope">;

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

function getFormString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function reallocateCapitalAction(
  formData: FormData,
): Promise<FinancialActionResult> {
  const input = {
    envelopeId: getFormString(formData, "envelopeId").trim(),
    sourceInvestment: getFormString(formData, "sourceInvestment")
      .trim()
      .replace(/\s+/g, " "),
    sourceAccount: getFormString(formData, "sourceAccount")
      .trim()
      .replace(/\s+/g, " "),
    destinationInvestment: getFormString(formData, "destinationInvestment")
      .trim()
      .replace(/\s+/g, " "),
    destinationAccount: getFormString(formData, "destinationAccount")
      .trim()
      .replace(/\s+/g, " "),
    currency: getFormString(formData, "currency").trim().toUpperCase(),
    amount: Number(getFormString(formData, "amount")),
    occurredAt: getFormString(formData, "occurredAt").trim(),
    note: getFormString(formData, "note").trim() || null,
  };

  const validationError = validateReallocateCapitalInput(input);

  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const operationId = await reallocateCapital(input);
    revalidatePath("/");
    return { success: true, operationId };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "No se pudo redistribuir el capital."),
    };
  }
}

async function validateAndNormalizeMovementInput(
  type: FinancialMovement["type"],
  input: MovementActionInput,
): Promise<{
  input: Omit<CreateMovementInput, "type">;
  movements: FinancialMovement[];
}> {
  const normalizedInvestment = normalizeText(input.investment);
  const normalizedAccount = normalizeText(input.account);
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
  const requiresEnvelope = movementRequiresEnvelope(
    type,
    input.withdrawal_kind,
  );
  const envelopeId = input.envelope_id?.trim() || null;
  const isUuid =
    envelopeId !== null &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      envelopeId,
    );

  if (requiresEnvelope && envelopeId && !isUuid) {
    throw new Error(MOVEMENT_ENVELOPE_NOT_FOUND_ERROR);
  }

  const selectedEnvelope =
    requiresEnvelope && envelopeId && isUuid
      ? await getEnvelopeById(envelopeId)
      : null;
  const envelopeAssociation = resolveMovementEnvelope({
    type,
    withdrawalKind: input.withdrawal_kind,
    envelopeId,
    currency,
    envelope: selectedEnvelope,
  });

  return {
    input: {
      investment,
      account,
      ...envelopeAssociation,
      withdrawal_kind: input.withdrawal_kind,
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
    const validated = await validateAndNormalizeMovementInput(type, input);
    const withdrawalKind = validated.input.withdrawal_kind;
    const normalizedInput = {
      ...validated.input,
      withdrawal_kind: type === "withdrawal" ? withdrawalKind : null,
    };

    if (type === "withdrawal") {
      if (withdrawalKind !== "capital" && withdrawalKind !== "return") {
        return { success: false, error: "Elegí el origen del retiro." };
      }

      const withdrawalError = validateWithdrawalAmount(
        validated.movements,
        {
          investment: normalizedInput.investment,
          account: normalizedInput.account,
          currency: normalizedInput.currency,
          envelope: normalizedInput.envelope,
          envelopeId: normalizedInput.envelope_id,
          withdrawalKind,
        },
        normalizedInput.amount,
      );

      if (withdrawalError) {
        return { success: false, error: withdrawalError };
      }
    }

    if (type === "contribution") {
      await registerNewCapital({
        envelope_id: normalizedInput.envelope_id!,
        investment: normalizedInput.investment,
        account: normalizedInput.account,
        currency: normalizedInput.currency,
        amount: normalizedInput.amount,
        occurred_at: normalizedInput.occurred_at,
        note: normalizedInput.note,
      });
    } else if (type === "withdrawal") {
      await createWithdrawal(normalizedInput);
    } else {
      await createValuation(normalizedInput);
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
  input: UpdateMovementActionInput,
): Promise<FinancialActionResult> {
  try {
    if (!id.trim()) {
      throw new Error("El movimiento es inválido");
    }

    if (!movementTypes.includes(input.type)) {
      throw new Error("El tipo de movimiento es inválido");
    }

    const validated = await validateAndNormalizeMovementInput(input.type, input);
    const originalMovement = validated.movements.find(
      (movement) => movement.id === id,
    );

    if (!originalMovement) {
      throw new Error("El movimiento no existe.");
    }

    if (originalMovement.capital_flow_kind !== null) {
      throw new Error(
        originalMovement.capital_flow_kind === "new_capital"
          ? "Los aportes de nuevo capital no se pueden editar; deben revertirse."
          : "Las redistribuciones no se pueden editar individualmente.",
      );
    }

    const withdrawalKind = validated.input.withdrawal_kind;
    const normalizedInput = {
      ...validated.input,
      withdrawal_kind:
        input.type === "withdrawal" ? withdrawalKind : null,
    };

    if (input.type === "withdrawal") {
      if (withdrawalKind !== "capital" && withdrawalKind !== "return") {
        return { success: false, error: "Elegí el origen del retiro." };
      }

      const withdrawalError = validateWithdrawalAmount(
        validated.movements.filter((movement) => movement.id !== id),
        {
          investment: normalizedInput.investment,
          account: normalizedInput.account,
          currency: normalizedInput.currency,
          envelope: normalizedInput.envelope,
          envelopeId: normalizedInput.envelope_id,
          withdrawalKind,
        },
        normalizedInput.amount,
      );

      if (withdrawalError) {
        return { success: false, error: withdrawalError };
      }
    }

    await updateFinancialMovement(id, {
      ...normalizedInput,
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

    const movement = await getFinancialMovementById(id);

    if (!movement) {
      throw new Error("El movimiento no existe.");
    }

    const deletionMode = getMovementDeletionMode(movement);

    if (deletionMode === "revert-new-capital") {
      await revertNewCapital(id);
    } else if (deletionMode === "delete-history") {
      await deleteFinancialMovement(id);
    } else {
      throw new Error("Este movimiento requiere una reversión específica.");
    }

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
