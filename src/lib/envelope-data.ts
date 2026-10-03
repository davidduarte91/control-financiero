import "server-only";

import { ENVELOPE_ALREADY_EXISTS_ERROR } from "./envelope-validation";
import type { CreateEnvelopeInput, Envelope } from "./financial-types";
import { getSupabaseServerClient } from "./supabase-server";

export async function getEnvelopes(): Promise<Envelope[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("envelopes")
    .select("id, name, currency, balance, created_at, updated_at, archived_at")
    .is("archived_at", null)
    .order("name", { ascending: true })
    .order("currency", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Envelope[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getEnvelopeById(id: string): Promise<Envelope | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("envelopes")
    .select("id, name, currency, balance, created_at, updated_at, archived_at")
    .eq("id", id)
    .maybeSingle<Envelope>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createEnvelope(
  input: CreateEnvelopeInput,
): Promise<Envelope> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("envelopes")
    .insert({
      ...input,
      balance: 0,
    })
    .select("id, name, currency, balance, created_at, updated_at, archived_at")
    .single<Envelope>();

  if (error) {
    if (error.code === "23505") {
      throw new Error(ENVELOPE_ALREADY_EXISTS_ERROR);
    }

    throw new Error(error.message);
  }

  return data;
}
