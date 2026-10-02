import { describe, expect, it } from "vitest";

import type { Envelope } from "./financial-types";
import {
  MOVEMENT_ENVELOPE_ARCHIVED_ERROR,
  MOVEMENT_ENVELOPE_CURRENCY_ERROR,
  MOVEMENT_ENVELOPE_NOT_FOUND_ERROR,
  MOVEMENT_ENVELOPE_REQUIRED_ERROR,
  resolveMovementEnvelope,
} from "./movement-envelope";

function envelope(overrides: Partial<Envelope> = {}): Envelope {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Ahorro David",
    currency: "ARS",
    balance: 1_000,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    archived_at: null,
    ...overrides,
  };
}

describe("resolveMovementEnvelope", () => {
  it("associates a contribution with the canonical id and name", () => {
    const selectedEnvelope = envelope();

    expect(
      resolveMovementEnvelope({
        type: "contribution",
        withdrawalKind: null,
        envelopeId: selectedEnvelope.id,
        currency: "ARS",
        envelope: selectedEnvelope,
      }),
    ).toEqual({
      envelope_id: selectedEnvelope.id,
      envelope: "Ahorro David",
    });
  });

  it("associates a capital withdrawal with the canonical id and name", () => {
    const selectedEnvelope = envelope({ name: "Nombre canónico" });

    expect(
      resolveMovementEnvelope({
        type: "withdrawal",
        withdrawalKind: "capital",
        envelopeId: selectedEnvelope.id,
        currency: "ARS",
        envelope: selectedEnvelope,
      }),
    ).toEqual({
      envelope_id: selectedEnvelope.id,
      envelope: "Nombre canónico",
    });
  });

  it("rejects a nonexistent envelope id", () => {
    expect(() =>
      resolveMovementEnvelope({
        type: "contribution",
        withdrawalKind: null,
        envelopeId: "22222222-2222-4222-8222-222222222222",
        currency: "ARS",
        envelope: null,
      }),
    ).toThrow(MOVEMENT_ENVELOPE_NOT_FOUND_ERROR);
  });

  it("rejects an archived envelope", () => {
    const archivedEnvelope = envelope({
      archived_at: "2026-02-01T00:00:00Z",
    });

    expect(() =>
      resolveMovementEnvelope({
        type: "contribution",
        withdrawalKind: null,
        envelopeId: archivedEnvelope.id,
        currency: "ARS",
        envelope: archivedEnvelope,
      }),
    ).toThrow(MOVEMENT_ENVELOPE_ARCHIVED_ERROR);
  });

  it("rejects an envelope with a different currency", () => {
    const usdEnvelope = envelope({ currency: "USD" });

    expect(() =>
      resolveMovementEnvelope({
        type: "contribution",
        withdrawalKind: null,
        envelopeId: usdEnvelope.id,
        currency: "ARS",
        envelope: usdEnvelope,
      }),
    ).toThrow(MOVEMENT_ENVELOPE_CURRENCY_ERROR);
  });

  it("clears the envelope for a valuation", () => {
    const selectedEnvelope = envelope();

    expect(
      resolveMovementEnvelope({
        type: "valuation",
        withdrawalKind: null,
        envelopeId: selectedEnvelope.id,
        currency: "ARS",
        envelope: selectedEnvelope,
      }),
    ).toEqual({ envelope_id: null, envelope: null });
  });

  it("clears the envelope for a return withdrawal", () => {
    const selectedEnvelope = envelope();

    expect(
      resolveMovementEnvelope({
        type: "withdrawal",
        withdrawalKind: "return",
        envelopeId: selectedEnvelope.id,
        currency: "ARS",
        envelope: selectedEnvelope,
      }),
    ).toEqual({ envelope_id: null, envelope: null });
  });

  it("clears a capital association when changed to return", () => {
    expect(
      resolveMovementEnvelope({
        type: "withdrawal",
        withdrawalKind: "return",
        envelopeId: envelope().id,
        currency: "ARS",
        envelope: envelope(),
      }),
    ).toEqual({ envelope_id: null, envelope: null });
  });

  it("requires an envelope when a return is changed to capital", () => {
    expect(() =>
      resolveMovementEnvelope({
        type: "withdrawal",
        withdrawalKind: "capital",
        envelopeId: null,
        currency: "ARS",
        envelope: null,
      }),
    ).toThrow(MOVEMENT_ENVELOPE_REQUIRED_ERROR);
  });

  it("distinguishes equal names in ARS and USD by id", () => {
    const usdEnvelope = envelope({
      id: "33333333-3333-4333-8333-333333333333",
      currency: "USD",
    });

    expect(
      resolveMovementEnvelope({
        type: "contribution",
        withdrawalKind: null,
        envelopeId: usdEnvelope.id,
        currency: "USD",
        envelope: usdEnvelope,
      }),
    ).toEqual({
      envelope_id: usdEnvelope.id,
      envelope: "Ahorro David",
    });
  });
});
