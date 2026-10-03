import { describe, expect, it } from "vitest";

import {
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
      }),
    ).toEqual({
      name: "Fondo de emergencia",
      currency: "ARS",
    });
  });

  it("returns only the fields required to create an empty envelope", () => {
    const result = normalizeCreateEnvelopeInput({
      name: "Nuevo objetivo",
      currency: "USD",
    });

    expect(result).toEqual({
      name: "Nuevo objetivo",
      currency: "USD",
    });
    expect(result).not.toHaveProperty("balance");
  });

  it("rejects an empty name", () => {
    expect(() =>
      normalizeCreateEnvelopeInput({
        name: "   ",
        currency: "ARS",
      }),
    ).toThrow(ENVELOPE_NAME_REQUIRED_ERROR);
  });

  it("rejects an empty currency", () => {
    expect(() =>
      normalizeCreateEnvelopeInput({
        name: "Objetivo",
        currency: "  ",
      }),
    ).toThrow(ENVELOPE_CURRENCY_REQUIRED_ERROR);
  });
});
