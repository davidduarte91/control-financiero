import type { FinancialMovement } from "./financial-types";
import { supabase } from "./supabase";

export interface CreateMovementInput {
  investment: string;
  account: string;
  envelope: string | null;
  currency: string;
  amount: number;
  occurred_at: string;
  note: string | null;
}

export async function getFinancialMovements(): Promise<FinancialMovement[]> {
  const { data, error } = await supabase
    .from("financial_movements")
    .select("*")
    .order("occurred_at", { ascending: false })
    .returns<FinancialMovement[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createContribution(
  input: CreateMovementInput,
): Promise<FinancialMovement> {
  const { data, error } = await supabase
    .from("financial_movements")
    .insert({
      ...input,
      type: "contribution",
    })
    .select("*")
    .single<FinancialMovement>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createWithdrawal(
  input: CreateMovementInput,
): Promise<FinancialMovement> {
  const { data, error } = await supabase
    .from("financial_movements")
    .insert({
      ...input,
      type: "withdrawal",
    })
    .select("*")
    .single<FinancialMovement>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createValuation(
  input: CreateMovementInput,
): Promise<FinancialMovement> {
  const { data, error } = await supabase
    .from("financial_movements")
    .insert({
      ...input,
      type: "valuation",
    })
    .select("*")
    .single<FinancialMovement>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
