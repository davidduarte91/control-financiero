import {
  calculateAvailableReturn,
  calculateEnvelopeRemainingCapital,
  calculatePositions,
} from "./financial-calculations";
import type {
  FinancialMovement,
  ReallocateCapitalInput,
  WithdrawObjectiveCapitalInput,
  WithdrawalKind,
} from "./financial-types";

interface PositionIdentity {
  investment: string;
  account: string;
  currency: string;
}

interface WithdrawalIdentity extends PositionIdentity {
  envelope: string | null;
  envelopeId?: string | null;
  withdrawalKind: WithdrawalKind;
}

interface WithdrawalValidationOptions {
  allowCapitalWithoutEnvelope?: boolean;
}

export const WITHDRAWAL_EXCEEDS_CAPITAL_ERROR =
  "No podés retirar más que el capital restante de esta posición.";
export const CAPITAL_WITHDRAWAL_REQUIRES_ENVELOPE_ERROR =
  "Elegí un sobre para retirar capital.";
export const WITHDRAWAL_EXCEEDS_ENVELOPE_CAPITAL_ERROR =
  "No podés retirar más que el capital atribuible a este sobre.";
export const RETURN_WITHDRAWAL_REQUIRES_NO_ENVELOPE_ERROR =
  "Un retiro de rendimientos no puede estar asociado a un sobre.";
export const WITHDRAWAL_EXCEEDS_RETURN_ERROR =
  "No podés retirar más que el rendimiento disponible de esta posición.";
export const CAPITAL_WITHDRAWAL_REQUIRES_OBJECTIVE_EXIT_ERROR =
  "Para retirar capital del objetivo, usá la acción “Retirar capital”.";
export const SENSITIVE_HISTORICAL_CAPITAL_MOVEMENT_ERROR =
  "Los movimientos históricos que afectan capital no se pueden editar ni eliminar directamente.";
export const SENSITIVE_HISTORICAL_CAPITAL_CREATION_ERROR =
  "No se puede convertir un movimiento en un movimiento histórico que afecta capital.";

export function validateNewWithdrawalKind(
  withdrawalKind: WithdrawalKind | null,
): string | null {
  if (withdrawalKind === "capital") {
    return CAPITAL_WITHDRAWAL_REQUIRES_OBJECTIVE_EXIT_ERROR;
  }

  if (withdrawalKind !== "return") {
    return "Elegí el origen del retiro.";
  }

  return null;
}

export function validateWithdrawObjectiveCapitalInput(
  input: WithdrawObjectiveCapitalInput,
): string | null {
  if (!input.envelopeId?.trim()) {
    return "El sobre es obligatorio.";
  }

  if (!input.investment?.trim()) {
    return "La inversión es obligatoria.";
  }

  if (!input.account?.trim()) {
    return "La cuenta es obligatoria.";
  }

  if (!input.currency?.trim()) {
    return "La moneda es obligatoria.";
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "El monto debe ser mayor que 0.";
  }

  if (!input.occurredAt?.trim()) {
    return "La fecha es obligatoria.";
  }

  return null;
}

export function validateReallocateCapitalInput(
  input: ReallocateCapitalInput,
): string | null {
  const sourceInvestment = normalizePositionValue(input.sourceInvestment);
  const sourceAccount = normalizePositionValue(input.sourceAccount);
  const destinationInvestment = normalizePositionValue(
    input.destinationInvestment,
  );
  const destinationAccount = normalizePositionValue(input.destinationAccount);

  if (!input.envelopeId?.trim()) {
    return "El sobre es obligatorio.";
  }

  if (!sourceInvestment) {
    return "La inversión de origen es obligatoria.";
  }

  if (!sourceAccount) {
    return "La cuenta de origen es obligatoria.";
  }

  if (!destinationInvestment) {
    return "La inversión de destino es obligatoria.";
  }

  if (!destinationAccount) {
    return "La cuenta de destino es obligatoria.";
  }

  if (
    sourceInvestment === destinationInvestment &&
    sourceAccount === destinationAccount
  ) {
    return "El origen y el destino no pueden ser la misma posición.";
  }

  if (!input.currency?.trim()) {
    return "La moneda es obligatoria.";
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "El monto debe ser mayor que 0.";
  }

  if (!input.occurredAt?.trim()) {
    return "La fecha es obligatoria.";
  }

  return null;
}

function normalizePositionValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export type MovementDeletionMode =
  | "delete-history"
  | "revert-new-capital"
  | "unsupported";

export function isSensitiveHistoricalCapitalMovement(
  movement: FinancialMovement,
): boolean {
  return (
    movement.capital_flow_kind === null &&
    (movement.type === "contribution" ||
      (movement.type === "withdrawal" &&
        movement.withdrawal_kind !== "return"))
  );
}

export function getMovementDeletionMode(
  movement: FinancialMovement,
): MovementDeletionMode {
  if (isSensitiveHistoricalCapitalMovement(movement)) {
    return "unsupported";
  }

  if (movement.capital_flow_kind === null) {
    return "delete-history";
  }

  if (
    movement.type === "contribution" &&
    movement.capital_flow_kind === "new_capital"
  ) {
    return "revert-new-capital";
  }

  return "unsupported";
}

export function getMovementEditError(
  movement: FinancialMovement,
): string | null {
  if (isSensitiveHistoricalCapitalMovement(movement)) {
    return SENSITIVE_HISTORICAL_CAPITAL_MOVEMENT_ERROR;
  }

  if (movement.capital_flow_kind === null) {
    return null;
  }

  if (movement.capital_flow_kind === "new_capital") {
    return "Los aportes de nuevo capital no se pueden editar; deben revertirse.";
  }

  if (movement.capital_flow_kind === "objective_exit") {
    return "Las salidas definitivas no se pueden editar; requieren una reversión específica.";
  }

  return "Las redistribuciones no se pueden editar individualmente.";
}

export function getMovementUpdateError(
  originalMovement: FinancialMovement,
  nextType: FinancialMovement["type"],
  nextWithdrawalKind: FinancialMovement["withdrawal_kind"],
): string | null {
  const editError = getMovementEditError(originalMovement);

  if (editError) {
    return editError;
  }

  const nextMovement = {
    ...originalMovement,
    type: nextType,
    withdrawal_kind:
      nextType === "withdrawal" ? nextWithdrawalKind : null,
  };

  if (
    isSensitiveHistoricalCapitalMovement(nextMovement) &&
    !isSensitiveHistoricalCapitalMovement(originalMovement)
  ) {
    return nextType === "withdrawal"
      ? CAPITAL_WITHDRAWAL_REQUIRES_OBJECTIVE_EXIT_ERROR
      : SENSITIVE_HISTORICAL_CAPITAL_CREATION_ERROR;
  }

  return null;
}

export function validateWithdrawalAmount(
  movements: FinancialMovement[],
  withdrawal: WithdrawalIdentity,
  amount: number,
  options: WithdrawalValidationOptions = {},
): string | null {
  const positionMovements = movements.filter(
    (movement) =>
      movement.investment === withdrawal.investment &&
      movement.account === withdrawal.account &&
      movement.currency === withdrawal.currency,
  );

  if (withdrawal.withdrawalKind === "return") {
    if (withdrawal.envelope !== null || withdrawal.envelopeId) {
      return RETURN_WITHDRAWAL_REQUIRES_NO_ENVELOPE_ERROR;
    }

    const availableReturn = calculateAvailableReturn(positionMovements);

    if (availableReturn <= 0 || amount > availableReturn) {
      return WITHDRAWAL_EXCEEDS_RETURN_ERROR;
    }

    return null;
  }

  if (!withdrawal.envelope) {
    if (!options.allowCapitalWithoutEnvelope) {
      return CAPITAL_WITHDRAWAL_REQUIRES_ENVELOPE_ERROR;
    }
  } else {
    const envelopeCapital = calculateEnvelopeRemainingCapital(
      positionMovements,
      withdrawal.envelope,
      withdrawal.envelopeId,
    );

    if (envelopeCapital <= 0 || amount > envelopeCapital) {
      return WITHDRAWAL_EXCEEDS_ENVELOPE_CAPITAL_ERROR;
    }
  }

  const matchingPosition = calculatePositions(positionMovements)[0];
  const remainingCapital = matchingPosition?.remainingCapital ?? 0;

  if (remainingCapital <= 0 || amount > remainingCapital) {
    return WITHDRAWAL_EXCEEDS_CAPITAL_ERROR;
  }

  return null;
}
