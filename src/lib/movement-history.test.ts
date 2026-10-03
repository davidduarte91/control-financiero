import { describe, expect, it } from "vitest";

import type { FinancialMovement } from "./financial-types";
import {
  getMovementHistoryLabel,
  groupMovementsForHistory,
  historyItemMatchesType,
} from "./movement-history";

function movement(
  id: string,
  type: FinancialMovement["type"],
  capitalFlowKind: FinancialMovement["capital_flow_kind"] = null,
  operationId: string | null = null,
): FinancialMovement {
  return {
    id,
    type,
    investment: type === "withdrawal" ? "Origen" : "Destino",
    account: "Cuenta",
    envelope: "Ahorro",
    envelope_id: "envelope-1",
    withdrawal_kind: type === "withdrawal" ? "capital" : null,
    capital_flow_kind: capitalFlowKind,
    operation_id: operationId,
    currency: "ARS",
    amount: 50_000,
    occurred_at: "2026-10-03T10:00:00Z",
    note: null,
    created_at: "2026-10-03T10:00:00Z",
  };
}

describe("groupMovementsForHistory", () => {
  it("groups reallocation withdrawal and contribution into one item", () => {
    const result = groupMovementsForHistory([
      movement("out", "withdrawal", "reallocation", "operation-1"),
      movement("in", "contribution", "reallocation", "operation-1"),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "reallocation",
      operationId: "operation-1",
      withdrawal: { id: "out" },
      contribution: { id: "in" },
    });

  });

  it("does not combine movements without the same operation id", () => {
    const result = groupMovementsForHistory([
      movement("out", "withdrawal", "reallocation", "operation-1"),
      movement("in", "contribution", "reallocation", "operation-2"),
    ]);

    expect(result).toHaveLength(2);
    expect(result.every((item) => item.kind === "movement")).toBe(true);
  });

  describe("getMovementHistoryLabel", () => {
    it("labels objective exits as capital withdrawals", () => {
      expect(
        getMovementHistoryLabel(
          movement("exit", "withdrawal", "objective_exit"),
        ),
      ).toBe("Retiro de capital");
    });

    it("keeps return withdrawals distinct from objective exits", () => {
      const returnWithdrawal = {
        ...movement("return", "withdrawal"),
        withdrawal_kind: "return" as const,
      };

      expect(getMovementHistoryLabel(returnWithdrawal)).toBe(
        "Retiro de rendimientos",
      );
    });
  });

  it("matches grouped redistributions under the contribution and withdrawal filters", () => {
    const [reallocation] = groupMovementsForHistory([
      movement("out", "withdrawal", "reallocation", "operation-1"),
      movement("in", "contribution", "reallocation", "operation-1"),
    ]);

    expect(historyItemMatchesType(reallocation, "contribution")).toBe(true);
    expect(historyItemMatchesType(reallocation, "withdrawal")).toBe(true);
    expect(historyItemMatchesType(reallocation, "valuation")).toBe(false);
  });
});
