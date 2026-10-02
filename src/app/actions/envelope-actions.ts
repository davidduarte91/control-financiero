"use server";

import { revalidatePath } from "next/cache";

import { createEnvelope } from "@/lib/envelope-data";
import { normalizeCreateEnvelopeInput } from "@/lib/envelope-validation";
import type { CreateEnvelopeInput } from "@/lib/financial-types";

export type EnvelopeActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createEnvelopeAction(
  input: CreateEnvelopeInput,
): Promise<EnvelopeActionResult> {
  try {
    const normalizedInput = normalizeCreateEnvelopeInput(input);
    await createEnvelope(normalizedInput);
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo crear el sobre.",
    };
  }
}
