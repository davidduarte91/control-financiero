# Notas de base de datos

## Modelo financiero

Un sobre representa el capital total de un objetivo y una inversión representa dónde está colocado. Un sobre puede abarcar varias inversiones y una inversión puede contener capital de varios sobres.

Una posición se identifica por los valores de `investment`, `account` y `currency`. ARS y USD permanecen separados. `envelopes.balance` debe coincidir con el capital neto atribuible al sobre mediante `envelope_id`.

Los sobres nuevos se crean siempre con `balance = 0`. El saldo inicial no es configurable: todo capital nuevo debe ingresar mediante `public.register_new_capital`.

## Movimientos y capital

El capital aportado es la suma de los movimientos `contribution`. El capital retirado es la suma de los movimientos `withdrawal` cuyo `withdrawal_kind` no sea `return`. Por lo tanto:

```text
remainingCapital = contributions - capital withdrawals
```

Los retiros de rendimiento reducen el valor actual y el rendimiento, pero no el capital restante.

### `capital_flow_kind`

| Valor | Movimiento | Significado |
| --- | --- | --- |
| `new_capital` | `contribution` | Entrada nueva de capital asociada a un sobre. |
| `reallocation` | `withdrawal` + `contribution` | Traslado entre posiciones; ambas patas comparten `operation_id`. |
| `objective_exit` | `withdrawal` de capital | Salida definitiva de capital perteneciente a un sobre. |
| `NULL` | Histórico, valuation o retiro de rendimiento | Su interpretación depende de `type` y `withdrawal_kind`. |

## Funciones financieras

| Función | Efecto en `financial_movements` | Efecto en `envelopes.balance` |
| --- | --- | --- |
| `register_new_capital` | Crea un `contribution` con `capital_flow_kind='new_capital'`. | Aumenta el balance. |
| `revert_new_capital` | Elimina el aporte original después de validar que el capital siga disponible en su posición. | Reduce el balance por el monto revertido. |
| `reallocate_capital` | Crea un retiro y un aporte con `capital_flow_kind='reallocation'` y el mismo `operation_id`. | No lo modifica. |
| `withdraw_objective_capital` | Crea un retiro de capital con `capital_flow_kind='objective_exit'`. | Reduce el balance. |
| `revert_objective_exit` | Elimina el retiro `objective_exit` original. | Aumenta el balance por el monto revertido. |
| `withdraw_investment_return` | Crea un retiro con `withdrawal_kind='return'`, sin sobre ni flujo de capital. | No lo modifica. |

Las reversiones eliminan el movimiento moderno original dentro de la misma transacción en que restauran el balance. No crean movimientos compensatorios.

`revert_new_capital` comprueba el capital atribuible al mismo `envelope_id` en la posición original. Si el aporte ya fue retirado o redistribuido y el capital atribuible disponible es insuficiente, rechaza la reversión.

`withdraw_investment_return` calcula el rendimiento disponible y crea el retiro en una sola transacción. El retiro no se atribuye a ningún sobre y no reduce el capital restante.

## Concurrencia por posición

Las operaciones que coordinan cambios o validaciones sobre una posición comparten un advisory lock transaccional. La identidad usada para el lock se construye así:

- `investment`: espacios consecutivos reducidos a uno y espacios exteriores eliminados.
- `account`: espacios consecutivos reducidos a uno y espacios exteriores eliminados.
- `currency`: la misma normalización de espacios y conversión a mayúsculas.

La clave y el lock siguen esta forma:

```sql
pg_catalog.hashtextextended(
  pg_catalog.jsonb_build_array(
    normalized_investment,
    normalized_account,
    normalized_currency
  )::text,
  731942801
)

pg_catalog.pg_advisory_xact_lock(position_lock_key)
```

Este lock se usa en `revert_new_capital`, `revert_objective_exit` y `withdraw_investment_return`. La normalización coordina operaciones concurrentes; no cambia por sí sola la identidad exacta usada por los cálculos financieros.

## Valuaciones y orden temporal

Sin valuaciones, `currentValue` es igual a `remainingCapital`. Con valuaciones, el valor actual es la última valuación más los aportes posteriores menos los retiros posteriores.

Todos los movimientos tienen un orden total por:

1. `occurred_at`.
2. `created_at`.
3. `id`.

La última valuación es la de clave máxima y un movimiento es posterior cuando su clave completa es mayor. Los cálculos TypeScript comparan los timestamps mediante `Date.parse`, con precisión de milisegundos, y desempatan UUID mediante comparación ordinal de strings. `withdraw_investment_return` replica la precisión temporal con `date_trunc('milliseconds', ...)` y usa `id` como último desempate.

Un movimiento con `occurred_at` anterior a una valuación queda absorbido por ella aunque haya sido creado posteriormente.

El rendimiento se calcula como:

```text
return = currentValue - remainingCapital
```

El porcentaje usa `remainingCapital` como base. Cuando `remainingCapital = 0`, el porcentaje es `null`.

## Protección de históricos

La aplicación protege contra edición y eliminación genéricas estos movimientos con `capital_flow_kind IS NULL`:

- Aportes históricos (`type='contribution'`).
- Retiros históricos de capital (`type='withdrawal'` y `withdrawal_kind` distinto de `return`).

Las valuaciones y los retiros de rendimiento continúan siendo editables. Los movimientos modernos sensibles usan sus flujos y reversiones dedicados.

En `public.financial_movements` existe el trigger `prevent_legacy_capital_withdrawal_creation`. Impide crear movimientos nuevos o convertir movimientos existentes a esta combinación legacy:

```text
type = 'withdrawal'
withdrawal_kind = 'capital'
capital_flow_kind IS NULL
```

Los retiros históricos ya existentes se conservan. El trigger no bloquea `objective_exit`, `reallocation` ni retiros con `withdrawal_kind='return'`.

### SQL de rollback del guard legacy

Este rollback corresponde únicamente al trigger legacy documentado anteriormente:

```sql
BEGIN;

DROP TRIGGER IF EXISTS prevent_legacy_capital_withdrawal_creation
ON public.financial_movements;

DROP FUNCTION IF EXISTS
  public.prevent_legacy_capital_withdrawal_creation();

COMMIT;
```

## Seguridad y permisos

- El acceso activo a Supabase se realiza desde el servidor.
- Las escrituras de la interfaz pasan por Server Actions.
- Las funciones financieras sensibles usan `SECURITY INVOKER` y `SET search_path = ''`.
- `PUBLIC`, `anon` y `authenticated` no tienen permiso de ejecución sobre esas funciones.
- Solo `service_role` tiene `EXECUTE`.
- La aplicación no usa Supabase Auth; el deployment debe protegerse externamente.
- Las credenciales con privilegios permanecen exclusivamente en variables de entorno del servidor.

## Consistencia operativa

- Las operaciones que cambian un balance y crean o eliminan un movimiento lo hacen en una misma transacción.
- `reallocate_capital` no modifica el balance porque el capital continúa perteneciendo al mismo sobre.
- `withdraw_objective_capital` reduce el capital de la posición y el balance del sobre.
- `revert_objective_exit` restaura ambos efectos en una misma transacción, incluso si el sobre está archivado; no modifica `archived_at`.
- `withdraw_investment_return` no modifica el balance del sobre.
- Los movimientos modernos sensibles no deben editarse ni eliminarse directamente.
- Si una operación falla, PostgreSQL revierte todos sus cambios.

La última auditoría de consistencia de los sobres reales terminó sin diferencias de balance, sin monedas incompatibles y con estado general correcto. Este documento no incluye identificadores, montos ni otros datos financieros de producción.
