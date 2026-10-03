import { describe, expect, it } from "vitest";

import type { FinancialMovement } from "./financial-types";
import {
  CAPITAL_WITHDRAWAL_REQUIRES_OBJECTIVE_EXIT_ERROR,
  CAPITAL_WITHDRAWAL_REQUIRES_ENVELOPE_ERROR,
  getMovementDeletionMode,
  getMovementEditError,
  getMovementUpdateError,
  isSensitiveHistoricalCapitalMovement,
  RETURN_WITHDRAWAL_REQUIRES_NO_ENVELOPE_ERROR,
  SENSITIVE_HISTORICAL_CAPITAL_MOVEMENT_ERROR,
  SENSITIVE_HISTORICAL_CAPITAL_CREATION_ERROR,
  validateReallocateCapitalInput,
  validateNewWithdrawalKind,
  validateWithdrawObjectiveCapitalInput,
  validateWithdrawalAmount,
  WITHDRAWAL_EXCEEDS_CAPITAL_ERROR,
  WITHDRAWAL_EXCEEDS_ENVELOPE_CAPITAL_ERROR,
  WITHDRAWAL_EXCEEDS_RETURN_ERROR,
} from "./financial-validation";

function movement(
  id: string,
  type: FinancialMovement["type"],
  amount: number,
  occurredAt: string,
  envelope: string | null,
  withdrawalKind: FinancialMovement["withdrawal_kind"] = null,
): FinancialMovement {
  return {
    id,
    type,
    investment: "Fondo A",
    account: "Cuenta 1",
    envelope,
    envelope_id: null,
    withdrawal_kind: withdrawalKind,
    capital_flow_kind: null,
    operation_id: null,
    currency: "ARS",
    amount,
    occurred_at: occurredAt,
    note: null,
    created_at: occurredAt,
  };
}

const movements: FinancialMovement[] = [
  movement("capital-a", "contribution", 1_000, "2026-01-01", "Emergencia"),
  movement("capital-b", "contribution", 500, "2026-01-02", "Viaje"),
  movement(
    "withdrawal-a",
    "withdrawal",
    200,
    "2026-01-03",
    "Emergencia",
    "capital",
  ),
  movement("valuation", "valuation", 1_700, "2026-01-04", null),
];

const validReallocation = {
  envelopeId: "envelope-1",
  sourceInvestment: "SBS RTA Pesos",
  sourceAccount: "Brubank",
  destinationInvestment: "Cedears",
  destinationAccount: "Brubank",
  currency: "ARS",
  amount: 50_000,
  occurredAt: "2026-10-03T10:00",
  note: null,
};

const validObjectiveExit = {
  envelopeId: "envelope-1",
  investment: "SBS RTA Pesos",
  account: "Brubank",
  currency: "ARS",
  amount: 50_000,
  occurredAt: "2026-10-03T10:00",
  note: null,
};

describe("validateNewWithdrawalKind", () => {
  it("allows new return withdrawals", () => {
    expect(validateNewWithdrawalKind("return")).toBeNull();
  });

  it("rejects legacy capital withdrawals and directs to objective exit", () => {
    expect(validateNewWithdrawalKind("capital")).toBe(
      CAPITAL_WITHDRAWAL_REQUIRES_OBJECTIVE_EXIT_ERROR,
    );
    expect(CAPITAL_WITHDRAWAL_REQUIRES_OBJECTIVE_EXIT_ERROR).toContain(
      "Retirar capital",
    );
  });

  it("rejects a missing withdrawal kind", () => {
    expect(validateNewWithdrawalKind(null)).toBe(
      "Elegí el origen del retiro.",
    );
  });
});

describe("isSensitiveHistoricalCapitalMovement", () => {
  it("classifies historical contributions as sensitive", () => {
    expect(isSensitiveHistoricalCapitalMovement(movements[0])).toBe(true);
  });

  it("classifies historical capital withdrawals as sensitive", () => {
    expect(isSensitiveHistoricalCapitalMovement(movements[2])).toBe(true);
  });

  it("classifies withdrawals with a null kind as sensitive", () => {
    expect(
      isSensitiveHistoricalCapitalMovement({
        ...movements[2],
        withdrawal_kind: null,
      }),
    ).toBe(true);
  });

  it("does not classify returns, valuations, or marked flows as sensitive", () => {
    expect(
      isSensitiveHistoricalCapitalMovement(
        movement("return", "withdrawal", 100, "2026-01-05", null, "return"),
      ),
    ).toBe(false);
    expect(isSensitiveHistoricalCapitalMovement(movements[3])).toBe(false);
    expect(
      isSensitiveHistoricalCapitalMovement({
        ...movements[0],
        capital_flow_kind: "new_capital",
      }),
    ).toBe(false);
  });
});

describe("validateWithdrawObjectiveCapitalInput", () => {
  it("accepts a valid objective exit", () => {
    expect(
      validateWithdrawObjectiveCapitalInput(validObjectiveExit),
    ).toBeNull();
  });

  it.each([0, -1])("rejects amount %s", (amount) => {
    expect(
      validateWithdrawObjectiveCapitalInput({
        ...validObjectiveExit,
        amount,
      }),
    ).toBe("El monto debe ser mayor que 0.");
  });

  it.each([
    ["envelopeId", "El sobre es obligatorio."],
    ["investment", "La inversión es obligatoria."],
    ["account", "La cuenta es obligatoria."],
  ] as const)("rejects missing %s", (field, expectedError) => {
    expect(
      validateWithdrawObjectiveCapitalInput({
        ...validObjectiveExit,
        [field]: "",
      }),
    ).toBe(expectedError);
  });
});

describe("validateReallocateCapitalInput", () => {
  it("accepts a valid reallocation", () => {
    expect(validateReallocateCapitalInput(validReallocation)).toBeNull();
  });

  it("rejects identical source and destination positions", () => {
    expect(
      validateReallocateCapitalInput({
        ...validReallocation,
        destinationInvestment: " SBS   RTA Pesos ",
      }),
    ).toBe("El origen y el destino no pueden ser la misma posición.");
  });

  it.each([0, -1])("rejects amount %s", (amount) => {
    expect(
      validateReallocateCapitalInput({ ...validReallocation, amount }),
    ).toBe("El monto debe ser mayor que 0.");
  });

  it("rejects missing required fields", () => {
    const missingRequiredFields: Array<
      [keyof typeof validReallocation, string]
    > = [
      ["envelopeId", "El sobre es obligatorio."],
      ["sourceInvestment", "La inversión de origen es obligatoria."],
      ["sourceAccount", "La cuenta de origen es obligatoria."],
      ["destinationInvestment", "La inversión de destino es obligatoria."],
      ["destinationAccount", "La cuenta de destino es obligatoria."],
      ["currency", "La moneda es obligatoria."],
      ["occurredAt", "La fecha es obligatoria."],
    ];

    for (const [field, expectedError] of missingRequiredFields) {
      expect(
        validateReallocateCapitalInput({
          ...validReallocation,
          [field]: "",
        }),
      ).toBe(expectedError);
    }
  });

  it("rejects a missing amount", () => {
    expect(
      validateReallocateCapitalInput({
        ...validReallocation,
        amount: Number.NaN,
      }),
    ).toBe("El monto debe ser mayor que 0.");
  });
});

describe("getMovementDeletionMode", () => {
  it("blocks deletion of historical contributions", () => {
    expect(getMovementDeletionMode(movements[0])).toBe("unsupported");
  });

  it("blocks deletion of historical capital withdrawals", () => {
    expect(getMovementDeletionMode(movements[2])).toBe("unsupported");
  });

  it("blocks deletion of historical withdrawals with a null kind", () => {
    expect(
      getMovementDeletionMode({ ...movements[2], withdrawal_kind: null }),
    ).toBe("unsupported");
  });

  it("keeps deletion available for historical returns and valuations", () => {
    const historicalReturn = movement(
      "return",
      "withdrawal",
      100,
      "2026-01-05",
      null,
      "return",
    );

    expect(getMovementDeletionMode(historicalReturn)).toBe("delete-history");
    expect(getMovementDeletionMode(movements[3])).toBe("delete-history");
  });

  it("routes new capital contributions through reversal", () => {
    expect(
      getMovementDeletionMode({
        ...movements[0],
        capital_flow_kind: "new_capital",
        operation_id: null,
      }),
    ).toBe("revert-new-capital");
  });

  it("rejects unsupported marked combinations", () => {
    expect(
      getMovementDeletionMode({
        ...movements[0],
        type: "valuation",
        capital_flow_kind: "new_capital",
        operation_id: null,
      }),
    ).toBe("unsupported");
  });

  it("does not allow individual deletion of reallocation movements", () => {
    expect(
      getMovementDeletionMode({
        ...movements[0],
        type: "withdrawal",
        withdrawal_kind: "capital",
        capital_flow_kind: "reallocation",
        operation_id: "operation-1",
      }),
    ).toBe("unsupported");
  });

  it("does not allow individual deletion or reversal of objective exits", () => {
    expect(
      getMovementDeletionMode({
        ...movements[0],
        type: "withdrawal",
        withdrawal_kind: "capital",
        capital_flow_kind: "objective_exit",
        operation_id: null,
      }),
    ).toBe("unsupported");
  });
});

describe("getMovementEditError", () => {
  it.each([
    ["historical contribution", movements[0]],
    ["historical capital withdrawal", movements[2]],
    [
      "historical withdrawal with a null kind",
      { ...movements[2], withdrawal_kind: null },
    ],
  ])("prevents editing a %s", (_label, historicalMovement) => {
    expect(getMovementEditError(historicalMovement)).toBe(
      SENSITIVE_HISTORICAL_CAPITAL_MOVEMENT_ERROR,
    );
  });

  it.each([
    [
      "new capital",
      {
        ...movements[0],
        capital_flow_kind: "new_capital" as const,
      },
      "Los aportes de nuevo capital no se pueden editar; deben revertirse.",
    ],
    [
      "reallocation",
      {
        ...movements[2],
        capital_flow_kind: "reallocation" as const,
        operation_id: "operation-1",
      },
      "Las redistribuciones no se pueden editar individualmente.",
    ],
    [
      "objective exit",
      {
        ...movements[2],
        capital_flow_kind: "objective_exit" as const,
      },
      "Las salidas definitivas no se pueden editar; requieren una reversión específica.",
    ],
  ])("keeps %s protected from individual editing", (_label, marked, error) => {
    expect(getMovementEditError(marked)).toBe(error);
  });

  it("allows editing historical returns and valuations", () => {
    const historicalReturn = movement(
      "return",
      "withdrawal",
      100,
      "2026-01-05",
      null,
      "return",
    );

    expect(getMovementEditError(historicalReturn)).toBeNull();
    expect(getMovementEditError(movements[3])).toBeNull();
  });
});

describe("getMovementUpdateError", () => {
  it("rejects changing a valuation into a historical contribution", () => {
    expect(
      getMovementUpdateError(movements[3], "contribution", null),
    ).toBe(SENSITIVE_HISTORICAL_CAPITAL_CREATION_ERROR);
  });

  it("rejects changing a return into a historical contribution", () => {
    const historicalReturn = movement(
      "return",
      "withdrawal",
      100,
      "2026-01-05",
      null,
      "return",
    );

    expect(
      getMovementUpdateError(historicalReturn, "contribution", null),
    ).toBe(SENSITIVE_HISTORICAL_CAPITAL_CREATION_ERROR);
  });

  it("rejects changing a valuation or return into a capital withdrawal", () => {
    const historicalReturn = movement(
      "return",
      "withdrawal",
      100,
      "2026-01-05",
      null,
      "return",
    );

    expect(
      getMovementUpdateError(movements[3], "withdrawal", "capital"),
    ).toBe(CAPITAL_WITHDRAWAL_REQUIRES_OBJECTIVE_EXIT_ERROR);
    expect(
      getMovementUpdateError(historicalReturn, "withdrawal", "capital"),
    ).toBe(CAPITAL_WITHDRAWAL_REQUIRES_OBJECTIVE_EXIT_ERROR);
  });

  it("allows changes that remain returns or valuations", () => {
    const historicalReturn = movement(
      "return",
      "withdrawal",
      100,
      "2026-01-05",
      null,
      "return",
    );

    expect(
      getMovementUpdateError(historicalReturn, "withdrawal", "return"),
    ).toBeNull();
    expect(getMovementUpdateError(movements[3], "valuation", null)).toBeNull();
  });

  it("rejects editing a historical capital movement before considering its target", () => {
    expect(
      getMovementUpdateError(movements[0], "valuation", null),
    ).toBe(SENSITIVE_HISTORICAL_CAPITAL_MOVEMENT_ERROR);
  });
});

const position = {
  investment: "Fondo A",
  account: "Cuenta 1",
  currency: "ARS",
};

describe("validateWithdrawalAmount", () => {
  it("allows capital withdrawal up to the selected envelope capital", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        {
          ...position,
          envelope: "Emergencia",
          withdrawalKind: "capital",
        },
        800,
      ),
    ).toBeNull();
  });

  it("does not use capital from another envelope", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        {
          ...position,
          envelope: "Emergencia",
          withdrawalKind: "capital",
        },
        801,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_ENVELOPE_CAPITAL_ERROR);
  });

  it("requires an envelope for new capital withdrawals", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, envelope: null, withdrawalKind: "capital" },
        1,
      ),
    ).toBe(CAPITAL_WITHDRAWAL_REQUIRES_ENVELOPE_ERROR);
  });

  it("allows historical capital withdrawals without an envelope", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, envelope: null, withdrawalKind: "capital" },
        1,
        { allowCapitalWithoutEnvelope: true },
      ),
    ).toBeNull();
  });

  it("also enforces total remaining capital", () => {
    const inconsistentMovements = [
      movement("a", "contribution", 1_000, "2026-01-01", "Emergencia"),
      movement("b", "withdrawal", 600, "2026-01-02", "Viaje", "capital"),
    ];

    expect(
      validateWithdrawalAmount(
        inconsistentMovements,
        {
          ...position,
          envelope: "Emergencia",
          withdrawalKind: "capital",
        },
        500,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_CAPITAL_ERROR);
  });

  it("allows withdrawing exactly the available return", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, envelope: null, withdrawalKind: "return" },
        400,
      ),
    ).toBeNull();
  });

  it("rejects a withdrawal above the available return", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        { ...position, envelope: null, withdrawalKind: "return" },
        401,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_RETURN_ERROR);
  });

  it("rejects return withdrawals without positive return", () => {
    const noReturnMovements = [
      movement("capital", "contribution", 1_000, "2026-01-01", "Emergencia"),
    ];

    expect(
      validateWithdrawalAmount(
        noReturnMovements,
        { ...position, envelope: null, withdrawalKind: "return" },
        1,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_RETURN_ERROR);
  });

  it("requires return withdrawals to have no envelope", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        {
          ...position,
          envelope: "Emergencia",
          withdrawalKind: "return",
        },
        1,
      ),
    ).toBe(RETURN_WITHDRAWAL_REQUIRES_NO_ENVELOPE_ERROR);
  });

  it("supports editing by excluding the original withdrawal", () => {
    const returnWithdrawal = movement(
      "return",
      "withdrawal",
      100,
      "2026-01-05",
      null,
      "return",
    );
    const movementsWithReturn = [...movements, returnWithdrawal];

    expect(
      validateWithdrawalAmount(
        movementsWithReturn.filter(
          (existingMovement) => existingMovement.id !== returnWithdrawal.id,
        ),
        { ...position, envelope: null, withdrawalKind: "return" },
        400,
      ),
    ).toBeNull();
  });

  it("validates available return only against the selected currency", () => {
    const usdMovements: FinancialMovement[] = [
      {
        ...movement("usd-capital", "contribution", 100, "2026-01-01", "USD"),
        currency: "USD",
      },
      {
        ...movement("usd-valuation", "valuation", 150, "2026-01-02", null),
        currency: "USD",
      },
    ];
    const mixedCurrencies = [...movements, ...usdMovements];

    expect(
      validateWithdrawalAmount(
        mixedCurrencies,
        {
          ...position,
          currency: "USD",
          envelope: null,
          withdrawalKind: "return",
        },
        50,
      ),
    ).toBeNull();
    expect(
      validateWithdrawalAmount(
        mixedCurrencies,
        {
          ...position,
          currency: "USD",
          envelope: null,
          withdrawalKind: "return",
        },
        51,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_RETURN_ERROR);
  });

  it("rejects a withdrawal when the position does not exist", () => {
    expect(
      validateWithdrawalAmount(
        movements,
        {
          ...position,
          account: "Otra cuenta",
          envelope: "Emergencia",
          withdrawalKind: "capital",
        },
        1,
      ),
    ).toBe(WITHDRAWAL_EXCEEDS_ENVELOPE_CAPITAL_ERROR);
  });
});
