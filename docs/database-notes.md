# Notas de base de datos

## Protección contra retiros legacy de capital

En `public.financial_movements` existe el trigger `prevent_legacy_capital_withdrawal_creation`. Su objetivo es impedir la creación de nuevos retiros legacy de capital con esta combinación:

```text
type = 'withdrawal'
withdrawal_kind = 'capital'
capital_flow_kind IS NULL
```

Los retiros históricos que ya tienen esa combinación siguen permitidos para lectura. También se permiten actualizaciones de esos registros siempre que conserven la misma semántica.

El trigger no bloquea `objective_exit`, `reallocation` ni retiros con `withdrawal_kind = 'return'`.

### SQL de rollback

Este SQL elimina el trigger y su función asociada:

```sql
BEGIN;

DROP TRIGGER IF EXISTS prevent_legacy_capital_withdrawal_creation
ON public.financial_movements;

DROP FUNCTION IF EXISTS
  public.prevent_legacy_capital_withdrawal_creation();

COMMIT;
```
