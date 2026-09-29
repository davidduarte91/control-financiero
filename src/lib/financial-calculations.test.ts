import { describe, expect, it } from "vitest";

import {
  calculateContributedCapital,
  calculateCurrencySummaries,
  calculateCurrentValue,
  calculateEnvelopeSummaries,
  calculatePositions,
  calculateRemainingCapital,
  calculateReturn,
  calculateReturnPercentage,
  calculateWithdrawnCapital,
  groupMovementsByPosition,
} from "./financial-calculations";
import type { FinancialMovement } from "./financial-types";

const movements: FinancialMovement[] = [
  {
    id: "contribution-1",
    type: "contribution",
    investment: "Investment",
    account: "Account",
    envelope: null,
    currency: "ARS",
    amount: 1_000,
    occurred_at: "2026-01-01",
    note: null,
    created_at: "2026-01-01",
  },
  {
    id: "contribution-2",
    type: "contribution",
    investment: "Investment",
    account: "Account",
    envelope: null,
    currency: "ARS",
    amount: 500,
    occurred_at: "2026-01-02",
    note: null,
    created_at: "2026-01-02",
  },
  {
    id: "withdrawal-1",
    type: "withdrawal",
    investment: "Investment",
    account: "Account",
    envelope: null,
    currency: "ARS",
    amount: 300,
    occurred_at: "2026-01-03",
    note: null,
    created_at: "2026-01-03",
  },
  {
    id: "valuation-1",
    type: "valuation",
    investment: "Investment",
    account: "Account",
    envelope: null,
    currency: "ARS",
    amount: 10_000,
    occurred_at: "2026-01-04",
    note: null,
    created_at: "2026-01-04",
  },
];

function createMovement(
  id: string,
  type: FinancialMovement["type"],
  amount: number,
  occurredAt: string,
): FinancialMovement {
  return {
    id,
    type,
    investment: "Investment",
    account: "Account",
    envelope: null,
    currency: "ARS",
    amount,
    occurred_at: occurredAt,
    note: null,
    created_at: occurredAt,
  };
}

describe("financial calculations", () => {
  it("sums only contributions", () => {
    expect(calculateContributedCapital(movements)).toBe(1_500);
  });

  it("sums only withdrawals", () => {
    expect(calculateWithdrawnCapital(movements)).toBe(300);
  });

  it("subtracts withdrawals from contributions", () => {
    expect(calculateRemainingCapital(movements)).toBe(1_200);
  });

  it("ignores valuations in every calculation", () => {
    const valuations = movements.filter(
      (movement) => movement.type === "valuation",
    );

    expect(calculateContributedCapital(valuations)).toBe(0);
    expect(calculateWithdrawnCapital(valuations)).toBe(0);
    expect(calculateRemainingCapital(valuations)).toBe(0);
  });

  it("returns zero for an empty list", () => {
    expect(calculateContributedCapital([])).toBe(0);
    expect(calculateWithdrawnCapital([])).toBe(0);
    expect(calculateRemainingCapital([])).toBe(0);
  });
});

describe("calculateCurrentValue", () => {
  it("returns remaining capital when there are no valuations", () => {
    const movementsWithoutValuations = [
      createMovement("contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("withdrawal", "withdrawal", 250, "2026-01-02"),
    ];

    expect(calculateCurrentValue(movementsWithoutValuations)).toBe(750);
  });

  it("uses the latest chronological valuation when movements are unordered", () => {
    const unorderedMovements = [
      createMovement("latest", "valuation", 1_500, "2026-03-01"),
      createMovement("oldest", "valuation", 800, "2026-01-01"),
      createMovement("middle", "valuation", 1_000, "2026-02-01"),
    ];

    expect(calculateCurrentValue(unorderedMovements)).toBe(1_500);
  });

  it("adds contributions after the latest valuation", () => {
    const movementsWithContribution = [
      createMovement("valuation", "valuation", 1_000, "2026-01-01"),
      createMovement("contribution", "contribution", 300, "2026-01-02"),
    ];

    expect(calculateCurrentValue(movementsWithContribution)).toBe(1_300);
  });

  it("subtracts withdrawals after the latest valuation", () => {
    const movementsWithWithdrawal = [
      createMovement("valuation", "valuation", 1_000, "2026-01-01"),
      createMovement("withdrawal", "withdrawal", 200, "2026-01-02"),
    ];

    expect(calculateCurrentValue(movementsWithWithdrawal)).toBe(800);
  });

  it("ignores contributions and withdrawals before the latest valuation", () => {
    const movementsBeforeValuation = [
      createMovement("contribution", "contribution", 500, "2026-01-01"),
      createMovement("withdrawal", "withdrawal", 200, "2026-01-02"),
      createMovement("valuation", "valuation", 1_000, "2026-01-03"),
    ];

    expect(calculateCurrentValue(movementsBeforeValuation)).toBe(1_000);
  });

  it("uses only the latest of multiple valuations", () => {
    const movementsWithMultipleValuations = [
      createMovement("first", "valuation", 1_000, "2026-01-01"),
      createMovement("contribution", "contribution", 300, "2026-01-02"),
      createMovement("latest", "valuation", 2_000, "2026-01-03"),
      createMovement("withdrawal", "withdrawal", 200, "2026-01-04"),
    ];

    expect(calculateCurrentValue(movementsWithMultipleValuations)).toBe(1_800);
  });
});

describe("returns", () => {
  it("calculates a positive return", () => {
    const positiveReturnMovements = [
      createMovement("contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 1_200, "2026-01-02"),
    ];

    expect(calculateReturn(positiveReturnMovements)).toBe(200);
  });

  it("calculates a negative return", () => {
    const negativeReturnMovements = [
      createMovement("contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 800, "2026-01-02"),
    ];

    expect(calculateReturn(negativeReturnMovements)).toBe(-200);
  });

  it("calculates a zero return", () => {
    const zeroReturnMovements = [
      createMovement("contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 1_000, "2026-01-02"),
    ];

    expect(calculateReturn(zeroReturnMovements)).toBe(0);
  });

  it("calculates the correct positive return percentage", () => {
    const positivePercentageMovements = [
      createMovement("contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 1_250, "2026-01-02"),
    ];

    expect(calculateReturnPercentage(positivePercentageMovements)).toBe(25);
  });

  it("calculates the correct negative return percentage", () => {
    const negativePercentageMovements = [
      createMovement("contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 750, "2026-01-02"),
    ];

    expect(calculateReturnPercentage(negativePercentageMovements)).toBe(-25);
  });

  it("returns null when remaining capital is zero", () => {
    expect(calculateReturnPercentage([])).toBeNull();
  });

  it("accounts for contributions and withdrawals after a valuation", () => {
    const movementsAfterValuation = [
      createMovement("initial", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 1_200, "2026-01-02"),
      createMovement("later-contribution", "contribution", 300, "2026-01-03"),
      createMovement("later-withdrawal", "withdrawal", 100, "2026-01-04"),
    ];

    expect(calculateReturn(movementsAfterValuation)).toBe(200);
    expect(calculateReturnPercentage(movementsAfterValuation)).toBeCloseTo(
      16.666666666666664,
    );
  });
});

describe("groupMovementsByPosition", () => {
  it("groups movements with the same position fields", () => {
    const samePosition = [
      createMovement("first", "contribution", 1_000, "2026-01-01"),
      createMovement("second", "valuation", 1_200, "2026-01-02"),
    ];

    const groups = groupMovementsByPosition(samePosition);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({
      investment: "Investment",
      account: "Account",
      envelope: null,
      currency: "ARS",
      movements: samePosition,
    });
  });

  it("creates separate groups for different accounts", () => {
    const differentAccounts = [
      createMovement("first", "contribution", 1_000, "2026-01-01"),
      {
        ...createMovement("second", "contribution", 500, "2026-01-02"),
        account: "Other Account",
      },
    ];

    expect(groupMovementsByPosition(differentAccounts)).toHaveLength(2);
  });

  it("creates separate groups for different currencies", () => {
    const differentCurrencies = [
      createMovement("first", "contribution", 1_000, "2026-01-01"),
      {
        ...createMovement("second", "contribution", 500, "2026-01-02"),
        currency: "USD",
      },
    ];

    expect(groupMovementsByPosition(differentCurrencies)).toHaveLength(2);
  });

  it("creates separate groups for different envelopes", () => {
    const differentEnvelopes = [
      {
        ...createMovement("first", "contribution", 1_000, "2026-01-01"),
        envelope: "Long term",
      },
      {
        ...createMovement("second", "contribution", 500, "2026-01-02"),
        envelope: "Emergency",
      },
    ];

    expect(groupMovementsByPosition(differentEnvelopes)).toHaveLength(2);
  });

  it("groups null envelopes together", () => {
    const nullEnvelopes = [
      createMovement("first", "contribution", 1_000, "2026-01-01"),
      createMovement("second", "withdrawal", 200, "2026-01-02"),
    ];

    const groups = groupMovementsByPosition(nullEnvelopes);

    expect(groups).toHaveLength(1);
    expect(groups[0].envelope).toBeNull();
    expect(groups[0].movements).toHaveLength(2);
  });

  it("returns an empty array for an empty list", () => {
    expect(groupMovementsByPosition([])).toEqual([]);
  });

  it("does not modify the original movements array", () => {
    const original = [
      createMovement("first", "contribution", 1_000, "2026-01-01"),
      createMovement("second", "valuation", 1_200, "2026-01-02"),
    ];
    const originalSnapshot = structuredClone(original);

    const groups = groupMovementsByPosition(original);

    expect(original).toEqual(originalSnapshot);
    expect(groups[0].movements).not.toBe(original);
  });
});

describe("calculatePositions", () => {
  it("returns every calculation for a single position", () => {
    const singlePosition = [
      createMovement("initial", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 1_200, "2026-01-02"),
      createMovement("later-contribution", "contribution", 300, "2026-01-03"),
      createMovement("later-withdrawal", "withdrawal", 100, "2026-01-04"),
    ];

    expect(calculatePositions(singlePosition)).toEqual([
      {
        investment: "Investment",
        account: "Account",
        envelope: null,
        currency: "ARS",
        contributedCapital: 1_300,
        withdrawnCapital: 100,
        remainingCapital: 1_200,
        currentValue: 1_400,
        returnAmount: 200,
        returnPercentage: 16.666666666666664,
      },
    ]);
  });

  it("calculates multiple positions independently", () => {
    const multiplePositions = [
      createMovement("first-contribution", "contribution", 1_000, "2026-01-01"),
      {
        ...createMovement(
          "second-contribution",
          "contribution",
          500,
          "2026-01-01",
        ),
        investment: "Other Investment",
      },
      {
        ...createMovement("second-valuation", "valuation", 600, "2026-01-02"),
        investment: "Other Investment",
      },
    ];

    const positions = calculatePositions(multiplePositions);

    expect(positions).toHaveLength(2);
    expect(positions[0].remainingCapital).toBe(1_000);
    expect(positions[0].returnAmount).toBe(0);
    expect(positions[1].remainingCapital).toBe(500);
    expect(positions[1].returnAmount).toBe(100);
  });

  it("never mixes movements with different currencies", () => {
    const differentCurrencies = [
      createMovement("ars", "contribution", 1_000, "2026-01-01"),
      {
        ...createMovement("usd", "contribution", 50, "2026-01-02"),
        currency: "USD",
      },
    ];

    const positions = calculatePositions(differentCurrencies);

    expect(positions).toHaveLength(2);
    expect(positions[0]).toMatchObject({
      currency: "ARS",
      contributedCapital: 1_000,
    });
    expect(positions[1]).toMatchObject({
      currency: "USD",
      contributedCapital: 50,
    });
  });

  it("uses remaining capital as current value without valuations", () => {
    const positionWithoutValuation = [
      createMovement("contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("withdrawal", "withdrawal", 250, "2026-01-02"),
    ];

    const [position] = calculatePositions(positionWithoutValuation);

    expect(position.currentValue).toBe(750);
    expect(position.remainingCapital).toBe(750);
  });

  it("uses the existing valuation logic", () => {
    const positionWithValuation = [
      createMovement("initial", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 1_250, "2026-01-02"),
      createMovement("later", "contribution", 100, "2026-01-03"),
    ];

    const [position] = calculatePositions(positionWithValuation);

    expect(position.currentValue).toBe(1_350);
    expect(position.returnAmount).toBe(250);
  });

  it("returns a null percentage when remaining capital is zero", () => {
    const zeroRemainingCapital = [
      createMovement("contribution", "contribution", 500, "2026-01-01"),
      createMovement("withdrawal", "withdrawal", 500, "2026-01-02"),
    ];

    const [position] = calculatePositions(zeroRemainingCapital);

    expect(position.remainingCapital).toBe(0);
    expect(position.returnPercentage).toBeNull();
  });

  it("returns an empty array for an empty list", () => {
    expect(calculatePositions([])).toEqual([]);
  });
});

describe("calculateCurrencySummaries", () => {
  it("calculates a summary for a single currency", () => {
    const singleCurrency = [
      createMovement("contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("valuation", "valuation", 1_200, "2026-01-02"),
    ];

    expect(calculateCurrencySummaries(singleCurrency)).toEqual([
      {
        currency: "ARS",
        remainingCapital: 1_000,
        currentValue: 1_200,
        returnAmount: 200,
        returnPercentage: 20,
      },
    ]);
  });

  it("sums multiple positions of the same currency", () => {
    const sameCurrencyPositions = [
      createMovement("first-contribution", "contribution", 1_000, "2026-01-01"),
      createMovement("first-valuation", "valuation", 1_200, "2026-01-02"),
      {
        ...createMovement(
          "second-contribution",
          "contribution",
          500,
          "2026-01-01",
        ),
        investment: "Other Investment",
      },
      {
        ...createMovement("second-valuation", "valuation", 550, "2026-01-02"),
        investment: "Other Investment",
      },
    ];

    expect(calculateCurrencySummaries(sameCurrencyPositions)).toEqual([
      {
        currency: "ARS",
        remainingCapital: 1_500,
        currentValue: 1_750,
        returnAmount: 250,
        returnPercentage: 16.666666666666664,
      },
    ]);
  });

  it("keeps ARS and USD in separate summaries", () => {
    const differentCurrencies = [
      createMovement("ars", "contribution", 1_000, "2026-01-01"),
      {
        ...createMovement("usd", "contribution", 100, "2026-01-01"),
        currency: "USD",
      },
    ];

    expect(calculateCurrencySummaries(differentCurrencies)).toEqual([
      {
        currency: "ARS",
        remainingCapital: 1_000,
        currentValue: 1_000,
        returnAmount: 0,
        returnPercentage: 0,
      },
      {
        currency: "USD",
        remainingCapital: 100,
        currentValue: 100,
        returnAmount: 0,
        returnPercentage: 0,
      },
    ]);
  });

  it("calculates percentage from totals instead of averaging position percentages", () => {
    const differentlyWeightedPositions = [
      createMovement("small-contribution", "contribution", 100, "2026-01-01"),
      createMovement("small-valuation", "valuation", 200, "2026-01-02"),
      {
        ...createMovement(
          "large-contribution",
          "contribution",
          900,
          "2026-01-01",
        ),
        investment: "Other Investment",
      },
      {
        ...createMovement("large-valuation", "valuation", 900, "2026-01-02"),
        investment: "Other Investment",
      },
    ];

    const [summary] = calculateCurrencySummaries(differentlyWeightedPositions);

    expect(summary.returnPercentage).toBe(10);
    expect(summary.returnPercentage).not.toBe(50);
  });

  it("returns a null percentage when total remaining capital is zero", () => {
    const zeroRemainingCapital = [
      createMovement("contribution", "contribution", 500, "2026-01-01"),
      createMovement("withdrawal", "withdrawal", 500, "2026-01-02"),
    ];

    expect(calculateCurrencySummaries(zeroRemainingCapital)).toEqual([
      {
        currency: "ARS",
        remainingCapital: 0,
        currentValue: 0,
        returnAmount: 0,
        returnPercentage: null,
      },
    ]);
  });

  it("returns an empty array for an empty list", () => {
    expect(calculateCurrencySummaries([])).toEqual([]);
  });
});

describe("calculateEnvelopeSummaries", () => {
  it("ignores movements without an envelope", () => {
    const movementsWithoutEnvelope = [
      createMovement("without-envelope", "contribution", 1_000, "2026-01-01"),
    ];

    expect(calculateEnvelopeSummaries(movementsWithoutEnvelope)).toEqual([]);
  });

  it("combines positions from the same envelope by currency", () => {
    const sameEnvelope = [
      {
        ...createMovement("first", "contribution", 1_000, "2026-01-01"),
        envelope: "Emergency",
      },
      {
        ...createMovement("second", "contribution", 500, "2026-01-02"),
        investment: "Other Investment",
        envelope: "Emergency",
      },
    ];

    expect(calculateEnvelopeSummaries(sameEnvelope)).toEqual([
      {
        envelope: "Emergency",
        currencySummaries: [
          {
            currency: "ARS",
            remainingCapital: 1_500,
            currentValue: 1_500,
            returnAmount: 0,
            returnPercentage: 0,
          },
        ],
      },
    ]);
  });

  it("keeps currencies separate within the same envelope", () => {
    const multipleCurrencies = [
      {
        ...createMovement("ars", "contribution", 1_000, "2026-01-01"),
        envelope: "Travel",
      },
      {
        ...createMovement("usd", "contribution", 100, "2026-01-02"),
        envelope: "Travel",
        currency: "USD",
      },
    ];

    const [envelope] = calculateEnvelopeSummaries(multipleCurrencies);

    expect(envelope.currencySummaries).toHaveLength(2);
    expect(envelope.currencySummaries[0]).toMatchObject({
      currency: "ARS",
      remainingCapital: 1_000,
    });
    expect(envelope.currencySummaries[1]).toMatchObject({
      currency: "USD",
      remainingCapital: 100,
    });
  });

  it("creates separate summaries for different envelopes", () => {
    const differentEnvelopes = [
      {
        ...createMovement("first", "contribution", 1_000, "2026-01-01"),
        envelope: "Emergency",
      },
      {
        ...createMovement("second", "contribution", 500, "2026-01-02"),
        envelope: "Travel",
      },
    ];

    const summaries = calculateEnvelopeSummaries(differentEnvelopes);

    expect(summaries).toHaveLength(2);
    expect(summaries.map((summary) => summary.envelope)).toEqual([
      "Emergency",
      "Travel",
    ]);
  });
});
