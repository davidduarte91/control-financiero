import type { FinancialMovement } from "./financial-types";
import { supabase } from "./supabase";

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
