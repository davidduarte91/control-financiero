import type { FinancialMovement } from "./financial-types";

export const MOVEMENT_FORM_PREFILL_EVENT = "movement-form:prefill";
export const MOVEMENT_FORM_OPEN_EVENT = "movement-form:open";

export interface MovementFormPrefill {
  type: FinancialMovement["type"];
  investment?: string;
  account?: string;
  envelope?: string | null;
  currency?: string;
}
