export type MovementType =
  | "contribution"
  | "withdrawal"
  | "valuation";

export type WithdrawalKind = "capital" | "return";
export type CapitalFlowKind = "new_capital" | "reallocation";

export interface ReallocateCapitalInput {
  envelopeId: string;
  sourceInvestment: string;
  sourceAccount: string;
  destinationInvestment: string;
  destinationAccount: string;
  currency: string;
  amount: number;
  occurredAt: string;
  note: string | null;
}

export interface Envelope {
  id: string;
  name: string;
  currency: string;
  balance: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateEnvelopeInput {
  name: string;
  currency: string;
  balance: number;
}

export interface FinancialMovement {
  id: string;
  type: MovementType;
  investment: string;
  account: string;
  envelope: string | null;
  envelope_id: string | null;
  withdrawal_kind: WithdrawalKind | null;
  capital_flow_kind: CapitalFlowKind | null;
  operation_id: string | null;
  currency: string;
  amount: number;
  occurred_at: string;
  note: string | null;
  created_at: string;
}
