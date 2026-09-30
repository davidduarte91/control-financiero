import { describe, expect, it } from "vitest";

import type { FinancialMovement } from "./financial-types";
import {
  validateWithdrawalAmount,
  WITHDRAWAL_EXCEEDS_CAPITAL_ERROR,
} from "./financial-validation";

const movements: FinancialMovement[] = [
  {
    id: "1",
    type: "contribution",
    investment: "Fondo A",
    account: "Cuenta 1",
    envelope: "Emergencia",
    currency: "ARS",
    amount: 1000,
    occurred_at: "2026-01-01T10:00:00",
    note: null,
    created_at: "2026-01-01T10:00:00",
  },
  {
    id: "2",
    type: "withdrawal",
    investment: "Fondo A",
    account: "Cuenta 1",
    envelope: "Emergencia",
    currency: "ARS",
    amount: 200,
    occurred_at: "2026-01-02T10:00:00",
    note: null,
    created_at: "2026-01-02T10:00:00",
  },
];

const position = {
  investment: "Fondo A",
  account: "Cuenta 1",
  envelope: "Emergencia",
  currency: "ARS",
};

describe("validateWithdrawalAmount", () => {
  it("allows withdrawing up to the remaining capital", () => {
    expect(validateWithdrawalAmount(movements, position, 800)).toBeNull();
  });

  it("rejects an amount above the remaining capital", () => {
    expect(validateWithdrawalAmount(movements, position, 801)).toBe(
      WITHDRAWAL_EXCEEDS_CAPITAL_ERROR,
    );
  });

  it("rejects a withdrawal when the position does not exist", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, account: "Otra cuenta" },
        1,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_CAPITAL_ERROR);
  });
});
