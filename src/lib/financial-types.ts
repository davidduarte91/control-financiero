export type MovementType =
  | "contribution"
  | "withdrawal"
  | "valuation";

export type WithdrawalKind = "capital" | "return";

export interface FinancialMovement {
  id: string;
  type: MovementType;
  investment: string;
  account: string;
  envelope: string | null;
  withdrawal_kind: WithdrawalKind | null;
  currency: string;
  amount: number;
  occurred_at: string;
  note: string | null;
  created_at: string;
}
