import "server-only";

import type { FinancialMovement } from "./financial-types";
import { getSupabaseServerClient } from "./supabase-server";

export interface CreateMovementInput {
  type: FinancialMovement["type"];
  investment: string;
  account: string;
  envelope: string | null;
  envelope_id: string | null;
  withdrawal_kind: FinancialMovement["withdrawal_kind"];
  currency: string;
  amount: number;
  occurred_at: string;
  note: string | null;
}

export async function getFinancialMovements(): Promise<FinancialMovement[]> {
  const supabase = getSupabaseServerClient();
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
  input: Omit<CreateMovementInput, "type">,
): Promise<FinancialMovement> {
  const supabase = getSupabaseServerClient();
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
  input: Omit<CreateMovementInput, "type">,
): Promise<FinancialMovement> {
  const supabase = getSupabaseServerClient();
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
  input: Omit<CreateMovementInput, "type">,
): Promise<FinancialMovement> {
  const supabase = getSupabaseServerClient();
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

export async function deleteFinancialMovement(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_movements")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateFinancialMovement(
  id: string,
  input: CreateMovementInput,
): Promise<FinancialMovement> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_movements")
    .update(input)
    .eq("id", id)
    .select("*")
    .single<FinancialMovement>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function renameEnvelope(
  currentName: string,
  newName: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("financial_movements")
    .update({ envelope: newName })
    .eq("envelope", currentName);

  if (error) {
    throw new Error(error.message);
  }
}
