import type { FinancialMovement, WithdrawalKind } from "./financial-types";

export const MOVEMENT_FORM_PREFILL_EVENT = "movement-form:prefill";
export const MOVEMENT_FORM_OPEN_EVENT = "movement-form:open";
export const REALLOCATION_FORM_OPEN_EVENT = "reallocation-form:open";

export interface MovementFormPrefill {
  type: FinancialMovement["type"];
  investment?: string;
  account?: string;
  envelopeId?: string | null;
  withdrawalKind?: WithdrawalKind;
  currency?: string;
}
