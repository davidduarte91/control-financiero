import "server-only";

import type {
  FinancialMovement,
  ReallocateCapitalInput,
  WithdrawObjectiveCapitalInput,
} from "./financial-types";
import {
  getMovementDeletionMode,
  getMovementUpdateError,
} from "./financial-validation";
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

export async function reallocateCapital(
  input: ReallocateCapitalInput,
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("reallocate_capital", {
    p_envelope_id: input.envelopeId,
    p_source_investment: input.sourceInvestment,
    p_source_account: input.sourceAccount,
    p_destination_investment: input.destinationInvestment,
    p_destination_account: input.destinationAccount,
    p_currency: input.currency,
    p_amount: input.amount,
    p_occurred_at: input.occurredAt,
    p_note: input.note,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (typeof data !== "string" || !data) {
    throw new Error("La RPC no devolvió el identificador de la redistribución.");
  }

  return data;
}

export async function withdrawObjectiveCapital(
  input: WithdrawObjectiveCapitalInput,
): Promise<FinancialMovement> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("withdraw_objective_capital", {
      p_envelope_id: input.envelopeId,
      p_investment: input.investment,
      p_account: input.account,
      p_currency: input.currency,
      p_amount: input.amount,
      p_occurred_at: input.occurredAt,
      p_note: input.note,
    })
    .single<FinancialMovement>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
  input: Omit<CreateMovementInput, "type" | "withdrawal_kind"> & {
    withdrawal_kind: "return";
  },
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
  const movement = await getFinancialMovementById(id);

  if (!movement || getMovementDeletionMode(movement) !== "delete-history") {
    throw new Error(
      "El movimiento no existe o requiere una reversión específica.",
    );
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("financial_movements")
    .delete()
    .eq("id", id)
    .is("capital_flow_kind", null)
    .eq("type", movement.type);

  query =
    movement.withdrawal_kind === null
      ? query.is("withdrawal_kind", null)
      : query.eq("withdrawal_kind", movement.withdrawal_kind);

  const { data, error } = await query
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
  const movement = await getFinancialMovementById(id);

  if (!movement) {
    throw new Error("El movimiento no existe.");
  }

  const updateError = getMovementUpdateError(
    movement,
    input.type,
    input.withdrawal_kind,
  );

  if (updateError) {
    throw new Error(updateError);
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("financial_movements")
    .update(input)
    .eq("id", id)
    .eq("type", movement.type)
    .is("capital_flow_kind", null);

  query =
    movement.withdrawal_kind === null
      ? query.is("withdrawal_kind", null)
      : query.eq("withdrawal_kind", movement.withdrawal_kind);

  const { data, error } = await query
    .select("*")
    .maybeSingle<FinancialMovement>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "El movimiento cambió y no se pudo actualizar. Actualizá la página e intentá de nuevo.",
    );
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
