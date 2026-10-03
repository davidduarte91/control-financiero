import type { FinancialMovement } from "./financial-types";

export type MovementHistoryItem =
  | {
      kind: "movement";
      movement: FinancialMovement;
      occurredAt: string;
    }
  | {
      kind: "reallocation";
      operationId: string;
      withdrawal: FinancialMovement;
      contribution: FinancialMovement;
      occurredAt: string;
    };

function isReallocationPair(
  movements: FinancialMovement[],
): movements is [FinancialMovement, FinancialMovement] {
  return (
    movements.length === 2 &&
    movements.some((movement) => movement.type === "withdrawal") &&
    movements.some((movement) => movement.type === "contribution")
  );
}

export function groupMovementsForHistory(
  movements: FinancialMovement[],
): MovementHistoryItem[] {
  const reallocationsByOperation = new Map<string, FinancialMovement[]>();

  for (const movement of movements) {
    if (
      movement.capital_flow_kind !== "reallocation" ||
      movement.operation_id === null
    ) {
      continue;
    }

    const operationMovements =
      reallocationsByOperation.get(movement.operation_id) ?? [];
    operationMovements.push(movement);
    reallocationsByOperation.set(movement.operation_id, operationMovements);
  }

  const items: MovementHistoryItem[] = [];
  const groupedMovementIds = new Set<string>();

  for (const [operationId, operationMovements] of reallocationsByOperation) {
    if (!isReallocationPair(operationMovements)) {
      continue;
    }

    const withdrawal = operationMovements.find(
      (movement) => movement.type === "withdrawal",
    );
    const contribution = operationMovements.find(
      (movement) => movement.type === "contribution",
    );

    if (!withdrawal || !contribution) {
      continue;
    }

    groupedMovementIds.add(withdrawal.id);
    groupedMovementIds.add(contribution.id);
    items.push({
      kind: "reallocation",
      operationId,
      withdrawal,
      contribution,
      occurredAt:
        Date.parse(withdrawal.occurred_at) >=
        Date.parse(contribution.occurred_at)
          ? withdrawal.occurred_at
          : contribution.occurred_at,
    });
  }

  for (const movement of movements) {
    if (groupedMovementIds.has(movement.id)) {
      continue;
    }

    items.push({
      kind: "movement",
      movement,
      occurredAt: movement.occurred_at,
    });
  }

  return items.sort(
    (left, right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
  );
}

export function historyItemMatchesType(
  item: MovementHistoryItem,
  type: FinancialMovement["type"] | "all",
): boolean {
  if (type === "all") {
    return true;
  }

  if (item.kind === "reallocation") {
    return type === "contribution" || type === "withdrawal";
  }

  return item.movement.type === type;
}
