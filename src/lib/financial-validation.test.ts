import { describe, expect, it } from "vitest";

import type { FinancialMovement } from "./financial-types";
import {
  CAPITAL_WITHDRAWAL_REQUIRES_ENVELOPE_ERROR,
  RETURN_WITHDRAWAL_REQUIRES_NO_ENVELOPE_ERROR,
  validateWithdrawalAmount,
  WITHDRAWAL_EXCEEDS_CAPITAL_ERROR,
  WITHDRAWAL_EXCEEDS_ENVELOPE_CAPITAL_ERROR,
  WITHDRAWAL_EXCEEDS_RETURN_ERROR,
} from "./financial-validation";

function movement(
  id: string,
  type: FinancialMovement["type"],
  amount: number,
  occurredAt: string,
  envelope: string | null,
  withdrawalKind: FinancialMovement["withdrawal_kind"] = null,
): FinancialMovement {
  return {
    id,
    type,
    investment: "Fondo A",
    account: "Cuenta 1",
    envelope,
    envelope_id: null,
    withdrawal_kind: withdrawalKind,
    currency: "ARS",
    amount,
    occurred_at: occurredAt,
    note: null,
    created_at: occurredAt,
  };
}

const movements: FinancialMovement[] = [
  movement("capital-a", "contribution", 1_000, "2026-01-01", "Emergencia"),
  movement("capital-b", "contribution", 500, "2026-01-02", "Viaje"),
  movement(
    "withdrawal-a",
    "withdrawal",
    200,
    "2026-01-03",
    "Emergencia",
    "capital",
  ),
  movement("valuation", "valuation", 1_700, "2026-01-04", null),
];

const position = {
  investment: "Fondo A",
  account: "Cuenta 1",
  currency: "ARS",
};

describe("validateWithdrawalAmount", () => {
  it("allows capital withdrawal up to the selected envelope capital", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        {
          ...position,
          envelope: "Emergencia",
          withdrawalKind: "capital",
        },
        800,
      ),
    ).toBeNull();
  });

  it("does not use capital from another envelope", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        {
          ...position,
          envelope: "Emergencia",
          withdrawalKind: "capital",
        },
        801,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_ENVELOPE_CAPITAL_ERROR);
  });

  it("requires an envelope for new capital withdrawals", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, envelope: null, withdrawalKind: "capital" },
        1,
      ),
    ).toBe(CAPITAL_WITHDRAWAL_REQUIRES_ENVELOPE_ERROR);
  });

  it("allows historical capital withdrawals without an envelope", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, envelope: null, withdrawalKind: "capital" },
        1,
        { allowCapitalWithoutEnvelope: true },
      ),
    ).toBeNull();
  });

  it("also enforces total remaining capital", () => {
    const inconsistentMovements = [
      movement("a", "contribution", 1_000, "2026-01-01", "Emergencia"),
      movement("b", "withdrawal", 600, "2026-01-02", "Viaje", "capital"),
    ];

    expect(
      validateWithdrawalAmount(
        inconsistentMovements,
        {
          ...position,
          envelope: "Emergencia",
          withdrawalKind: "capital",
        },
        500,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_CAPITAL_ERROR);
  });

  it("allows withdrawing exactly the available return", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, envelope: null, withdrawalKind: "return" },
        400,
      ),
    ).toBeNull();
  });

  it("rejects a withdrawal above the available return", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, envelope: null, withdrawalKind: "return" },
        401,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_RETURN_ERROR);
  });

  it("rejects return withdrawals without positive return", () => {
    const noReturnMovements = [
      movement("capital", "contribution", 1_000, "2026-01-01", "Emergencia"),
    ];

    expect(
      validateWithdrawalAmount(
        noReturnMovements,
        { ...position, envelope: null, withdrawalKind: "return" },
        1,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_RETURN_ERROR);
  });

  it("requires return withdrawals to have no envelope", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        {
          ...position,
          envelope: "Emergencia",
          withdrawalKind: "return",
        },
        1,
      ),
    ).toBe(RETURN_WITHDRAWAL_REQUIRES_NO_ENVELOPE_ERROR);
  });

  it("supports editing by excluding the original withdrawal", () => {
    const returnWithdrawal = movement(
      "return",
      "withdrawal",
      100,
      "2026-01-05",
      null,
      "return",
    );
    const movementsWithReturn = [...movements, returnWithdrawal];

    expect(
      validateWithdrawalAmount(
        movementsWithReturn.filter(
          (existingMovement) => existingMovement.id !== returnWithdrawal.id,
        ),
        { ...position, envelope: null, withdrawalKind: "return" },
        400,
      ),
    ).toBeNull();
  });

  it("validates available return only against the selected currency", () => {
    const usdMovements: FinancialMovement[] = [
      {
        ...movement("usd-capital", "contribution", 100, "2026-01-01", "USD"),
        currency: "USD",
      },
      {
        ...movement("usd-valuation", "valuation", 150, "2026-01-02", null),
        currency: "USD",
      },
    ];
    const mixedCurrencies = [...movements, ...usdMovements];

    expect(
      validateWithdrawalAmount(
        mixedCurrencies,
        {
          ...position,
          currency: "USD",
          envelope: null,
          withdrawalKind: "return",
        },
        50,
      ),
    ).toBeNull();
    expect(
      validateWithdrawalAmount(
        mixedCurrencies,
        {
          ...position,
          currency: "USD",
          envelope: null,
          withdrawalKind: "return",
        },
        51,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_RETURN_ERROR);
  });

  it("rejects a withdrawal when the position does not exist", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        {
          ...position,
          account: "Otra cuenta",
          envelope: "Emergencia",
          withdrawalKind: "capital",
        },
        1,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_ENVELOPE_CAPITAL_ERROR);
  });
});
