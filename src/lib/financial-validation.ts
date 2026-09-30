import { calculatePositions } from "./financial-calculations";
import type { FinancialMovement } from "./financial-types";

interface PositionIdentity {
  investment: string;
  account: string;
  envelope: string | null;
  currency: string;
}

export const WITHDRAWAL_EXCEEDS_CAPITAL_ERROR =
  "No podés retirar más que el capital restante de esta posición.";

export function validateWithdrawalAmount(
  movements: FinancialMovement[],
  position: PositionIdentity,
  amount: number,
): string | null {
  const matchingPosition = calculatePositions(movements).find(
    (candidate) =>
      candidate.investment === position.investment &&
      candidate.account === position.account &&
      candidate.envelope === position.envelope &&
      candidate.currency === position.currency,
  );
  const remainingCapital = matchingPosition?.remainingCapital ?? 0;

  if (remainingCapital <= 0 || amount > remainingCapital) {
    return WITHDRAWAL_EXCEEDS_CAPITAL_ERROR;
  }

  return null;
}
