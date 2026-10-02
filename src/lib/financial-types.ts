export type MovementType =
  | "contribution"
  | "withdrawal"
  | "valuation";

export type WithdrawalKind = "capital" | "return";

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
  currency: string;
  amount: number;
  occurred_at: string;
  note: string | null;
  created_at: string;
}
