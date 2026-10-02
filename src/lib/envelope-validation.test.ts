import { describe, expect, it } from "vitest";

import {
  ENVELOPE_BALANCE_INVALID_ERROR,
  ENVELOPE_CURRENCY_REQUIRED_ERROR,
  ENVELOPE_NAME_REQUIRED_ERROR,
  normalizeCreateEnvelopeInput,
} from "./envelope-validation";

describe("normalizeCreateEnvelopeInput", () => {
  it("normalizes name spaces and uppercases the currency", () => {
    expect(
      normalizeCreateEnvelopeInput({
        name: "  Fondo   de emergencia ",
        currency: " ars ",
        balance: 1_250.5,
      }),
    ).toEqual({
      name: "Fondo de emergencia",
      currency: "ARS",
      balance: 1_250.5,
    });
  });

  it("accepts an initial balance of zero", () => {
    expect(
      normalizeCreateEnvelopeInput({
        name: "Nuevo objetivo",
        currency: "USD",
        balance: 0,
      }).balance,
    ).toBe(0);
  });

  it("rejects an empty name", () => {
    expect(() =>
      normalizeCreateEnvelopeInput({
        name: "   ",
        currency: "ARS",
        balance: 0,
      }),
    ).toThrow(ENVELOPE_NAME_REQUIRED_ERROR);
  });

  it("rejects an empty currency", () => {
    expect(() =>
      normalizeCreateEnvelopeInput({
        name: "Objetivo",
        currency: "  ",
        balance: 0,
      }),
    ).toThrow(ENVELOPE_CURRENCY_REQUIRED_ERROR);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid balance: %s",
    (balance) => {
      expect(() =>
        normalizeCreateEnvelopeInput({
          name: "Objetivo",
          currency: "ARS",
          balance,
        }),
      ).toThrow(ENVELOPE_BALANCE_INVALID_ERROR);
    },
  );
});
