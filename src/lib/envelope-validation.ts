import type { CreateEnvelopeInput } from "./financial-types";

export const ENVELOPE_NAME_REQUIRED_ERROR =
  "El nombre del sobre es obligatorio.";
export const ENVELOPE_CURRENCY_REQUIRED_ERROR =
  "La moneda del sobre es obligatoria.";
export const ENVELOPE_ALREADY_EXISTS_ERROR =
  "Ya existe un sobre activo con ese nombre y moneda.";

export function normalizeCreateEnvelopeInput(
  input: CreateEnvelopeInput,
): CreateEnvelopeInput {
  const name = input.name.trim().replace(/\s+/g, " ");
  const currency = input.currency.trim().toUpperCase();

  if (!name) {
    throw new Error(ENVELOPE_NAME_REQUIRED_ERROR);
  }

  if (!currency) {
    throw new Error(ENVELOPE_CURRENCY_REQUIRED_ERROR);
  }

  return {
    name,
    currency,
  };
}
