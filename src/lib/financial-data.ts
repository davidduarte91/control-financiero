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

export interface RegisterNewCapitalInput {
  envelope_id: string;
  investment: string;
  account: string;
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

export async function getFinancialMovementById(
  id: string,
): Promise<FinancialMovement | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("financial_movements")
    .select("*")
    .eq("id", id)
    .maybeSingle<FinancialMovement>();

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

export async function registerNewCapital(
  input: RegisterNewCapitalInput,
): Promise<FinancialMovement> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("register_new_capital", {
      p_envelope_id: input.envelope_id,
      p_investment: input.investment,
      p_account: input.account,
      p_currency: input.currency,
      p_amount: input.amount,
      p_occurred_at: input.occurred_at,
      p_note: input.note,
    })
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
  const { data, error } = await supabase
    .from("financial_movements")
    .delete()
    .eq("id", id)
    .is("capital_flow_kind", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "El movimiento no existe o requiere una reversión específica.",
    );
  }
}

export async function revertNewCapital(
  contributionId: string,
): Promise<FinancialMovement> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("revert_new_capital", {
      p_contribution_id: contributionId,
    })
    .single<FinancialMovement>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
