import type {
  Envelope,
  MovementType,
  WithdrawalKind,
} from "./financial-types";

export const MOVEMENT_ENVELOPE_REQUIRED_ERROR =
  "Elegí un sobre activo para este movimiento.";
export const MOVEMENT_ENVELOPE_NOT_FOUND_ERROR =
  "El sobre seleccionado no existe.";
export const MOVEMENT_ENVELOPE_ARCHIVED_ERROR =
  "El sobre seleccionado está archivado.";
export const MOVEMENT_ENVELOPE_CURRENCY_ERROR =
  "La moneda del sobre no coincide con la moneda del movimiento.";

interface ResolveMovementEnvelopeInput {
  type: MovementType;
  withdrawalKind: WithdrawalKind | null;
  envelopeId: string | null;
  currency: string;
  envelope: Envelope | null;
}

export interface MovementEnvelopeAssociation {
  envelope_id: string | null;
  envelope: string | null;
}

export function movementRequiresEnvelope(
  type: MovementType,
  withdrawalKind: WithdrawalKind | null,
): boolean {
  return (
    type === "contribution" ||
    (type === "withdrawal" && withdrawalKind === "capital")
  );
}

export function resolveMovementEnvelope({
  type,
  withdrawalKind,
  envelopeId,
  currency,
  envelope,
}: ResolveMovementEnvelopeInput): MovementEnvelopeAssociation {
  if (!movementRequiresEnvelope(type, withdrawalKind)) {
    return { envelope_id: null, envelope: null };
  }

  if (!envelopeId) {
    throw new Error(MOVEMENT_ENVELOPE_REQUIRED_ERROR);
  }

  if (!envelope || envelope.id !== envelopeId) {
    throw new Error(MOVEMENT_ENVELOPE_NOT_FOUND_ERROR);
  }

  if (envelope.archived_at !== null) {
    throw new Error(MOVEMENT_ENVELOPE_ARCHIVED_ERROR);
  }

  if (envelope.currency.toUpperCase() !== currency.toUpperCase()) {
    throw new Error(MOVEMENT_ENVELOPE_CURRENCY_ERROR);
  }

  return {
    envelope_id: envelope.id,
    envelope: envelope.name,
  };
}
