import {
  calculateAvailableReturn,
  calculateEnvelopeRemainingCapital,
  calculatePositions,
} from "./financial-calculations";
import type { FinancialMovement, WithdrawalKind } from "./financial-types";

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
