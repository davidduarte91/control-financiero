import {
  calculateAvailableReturn,
  calculateEnvelopeRemainingCapital,
  calculatePositions,
} from "./financial-calculations";
import type {
  FinancialMovement,
  ReallocateCapitalInput,
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

export function getMovementDeletionMode(
  movement: FinancialMovement,
): MovementDeletionMode {
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
