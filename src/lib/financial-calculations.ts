import type { FinancialMovement } from "./financial-types";

export function calculateContributedCapital(
  movements: FinancialMovement[],
): number {
  return movements
    .filter((movement) => movement.type === "contribution")
    .reduce((total, movement) => total + movement.amount, 0);
}

export function calculateWithdrawnCapital(
  movements: FinancialMovement[],
): number {
  return movements
    .filter(
      (movement) =>
        movement.type === "withdrawal" &&
        movement.withdrawal_kind !== "return",
    )
    .reduce((total, movement) => total + movement.amount, 0);
}

export function calculateRemainingCapital(
  movements: FinancialMovement[],
): number {
  return (
    calculateContributedCapital(movements) -
    calculateWithdrawnCapital(movements)
  );
}

export function calculateCurrentValue(
  movements: FinancialMovement[],
): number {
  const latestValuation = movements
    .filter((movement) => movement.type === "valuation")
    .reduce<FinancialMovement | undefined>((latest, movement) => {
      if (
        !latest ||
        Date.parse(movement.occurred_at) > Date.parse(latest.occurred_at)
      ) {
        return movement;
      }

      return latest;
    }, undefined);

  if (!latestValuation) {
    return calculateRemainingCapital(movements);
  }

  const latestValuationTime = Date.parse(latestValuation.occurred_at);

  return movements.reduce((currentValue, movement) => {
    if (Date.parse(movement.occurred_at) <= latestValuationTime) {
      return currentValue;
    }

    if (movement.type === "contribution") {
      return currentValue + movement.amount;
    }

    if (movement.type === "withdrawal") {
      return currentValue - movement.amount;
    }

    return currentValue;
  }, latestValuation.amount);
}

export function calculateReturn(movements: FinancialMovement[]): number {
  return (
    calculateCurrentValue(movements) - calculateRemainingCapital(movements)
  );
}

export function calculateAvailableReturn(
  movements: FinancialMovement[],
): number {
  return Math.max(calculateReturn(movements), 0);
}

export function calculateEnvelopeRemainingCapital(
  movements: FinancialMovement[],
  envelope: string,
  envelopeId?: string | null,
): number {
  return calculateRemainingCapital(
    movements.filter((movement) => {
      if (envelopeId && movement.envelope_id !== null) {
        return movement.envelope_id === envelopeId;
      }

      return movement.envelope === envelope;
    }),
  );
}

export function calculateReturnPercentage(
  movements: FinancialMovement[],
): number | null {
  const remainingCapital = calculateRemainingCapital(movements);

  if (remainingCapital === 0) {
    return null;
  }

  return (calculateReturn(movements) / remainingCapital) * 100;
}

export function groupMovementsByPosition(
  movements: FinancialMovement[],
): Array<{
  investment: string;
  account: string;
  currency: string;
  movements: FinancialMovement[];
}> {
  const groups = new Map<
    string,
    {
      investment: string;
      account: string;
      currency: string;
      movements: FinancialMovement[];
    }
  >();

  for (const movement of movements) {
    const key = JSON.stringify([
      movement.investment,
      movement.account,
      movement.currency,
    ]);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.movements.push(movement);
      continue;
    }

    groups.set(key, {
      investment: movement.investment,
      account: movement.account,
      currency: movement.currency,
      movements: [movement],
    });
  }

  return Array.from(groups.values());
}

export function calculateEnvelopePositionCapitals(
  movements: FinancialMovement[],
  envelopeId: string,
): Array<{
  investment: string;
  account: string;
  currency: string;
  remainingCapital: number;
}> {
  const envelopeMovements = movements.filter(
    (movement) => movement.envelope_id === envelopeId,
  );

  return groupMovementsByPosition(envelopeMovements).map((group) => ({
    investment: group.investment,
    account: group.account,
    currency: group.currency,
    remainingCapital: calculateRemainingCapital(group.movements),
  }));
}

export function calculatePositions(movements: FinancialMovement[]) {
  return groupMovementsByPosition(movements).map((group) => ({
    investment: group.investment,
    account: group.account,
    currency: group.currency,
    contributedCapital: calculateContributedCapital(group.movements),
    withdrawnCapital: calculateWithdrawnCapital(group.movements),
    remainingCapital: calculateRemainingCapital(group.movements),
    currentValue: calculateCurrentValue(group.movements),
    returnAmount: calculateReturn(group.movements),
    returnPercentage: calculateReturnPercentage(group.movements),
  }));
}

export function calculateCurrencySummaries(movements: FinancialMovement[]) {
  const totalsByCurrency = new Map<
    string,
    { remainingCapital: number; currentValue: number }
  >();

  for (const position of calculatePositions(movements)) {
    const existingTotals = totalsByCurrency.get(position.currency);

    if (existingTotals) {
      existingTotals.remainingCapital += position.remainingCapital;
      existingTotals.currentValue += position.currentValue;
      continue;
    }

    totalsByCurrency.set(position.currency, {
      remainingCapital: position.remainingCapital,
      currentValue: position.currentValue,
    });
  }

  return Array.from(totalsByCurrency, ([currency, totals]) => {
    const returnAmount = totals.currentValue - totals.remainingCapital;

    return {
      currency,
      remainingCapital: totals.remainingCapital,
      currentValue: totals.currentValue,
      returnAmount,
      returnPercentage:
        totals.remainingCapital === 0
          ? null
          : (returnAmount / totals.remainingCapital) * 100,
    };
  });
}

export function calculateEnvelopeSummaries(movements: FinancialMovement[]) {
  const movementsByEnvelope = new Map<string, FinancialMovement[]>();

  for (const movement of movements) {
    if (movement.envelope === null) {
      continue;
    }

    const envelopeMovements = movementsByEnvelope.get(movement.envelope);

    if (envelopeMovements) {
      envelopeMovements.push(movement);
      continue;
    }

    movementsByEnvelope.set(movement.envelope, [movement]);
  }

  return Array.from(movementsByEnvelope, ([envelope, envelopeMovements]) => ({
    envelope,
    currencySummaries: calculateCurrencySummaries(envelopeMovements),
  }));
}
