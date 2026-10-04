# Control financiero

Aplicación personal para registrar capital, valuaciones, retiros y la distribución de objetivos de ahorro entre distintas inversiones. Mantiene ARS y USD separados y presenta el capital, el valor actual y el rendimiento de cada posición.

## Stack

- Next.js 16 con App Router
- React 19 y TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Vitest
- Vercel

## Modelo conceptual

Un **sobre** representa todo el capital perteneciente a un objetivo. Una **inversión** representa dónde está colocado ese capital. Un sobre puede estar distribuido entre varias inversiones y una inversión puede contener capital de varios sobres.

Una posición financiera se identifica por la combinación exacta de:

```text
investment + account + currency
```

ARS y USD se calculan por separado, sin conversiones automáticas.

## Funciones principales

- Crear sobres con saldo inicial cero.
- Registrar capital nuevo y asociarlo a un sobre y una posición.
- Redistribuir capital entre posiciones sin modificar el saldo total del sobre.
- Retirar capital definitivamente de un objetivo.
- Revertir aportes nuevos y salidas de capital mediante operaciones dedicadas.
- Registrar valuaciones y calcular valor actual, capital restante y rendimiento.
- Retirar rendimiento sin reducir el capital restante ni el saldo del sobre.
- Consultar el historial de movimientos con protecciones para operaciones sensibles.

## Configuración

Requisitos:

- Node.js compatible con las dependencias del proyecto.
- npm.
- Un proyecto Supabase con el esquema, las funciones y los permisos requeridos por la aplicación.

Variables de entorno del servidor:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` puede usarse en lugar de `SUPABASE_SECRET_KEY`. La credencial elegida debe permanecer exclusivamente en el servidor y nunca exponerse con el prefijo `NEXT_PUBLIC_`.

## Desarrollo y validación

```bash
npm install
npm run dev
```

La aplicación queda disponible normalmente en `http://localhost:3000`.

Comandos de validación:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Arquitectura

- Los componentes de la interfaz muestran el dashboard, sobres, inversiones e historial.
- Las escrituras se canalizan mediante Server Actions.
- La capa de datos del servidor usa el cliente de Supabase marcado como `server-only`.
- Las operaciones financieras que deben ser atómicas se ejecutan mediante funciones PostgreSQL.
- Los cálculos derivados se realizan en TypeScript a partir de los movimientos financieros.

La aplicación no usa Supabase Auth. Por ese motivo, el acceso al deployment debe protegerse externamente y las credenciales de servidor deben permanecer fuera del cliente y del repositorio.

## Reglas de integridad

- Los sobres nuevos siempre comienzan con `balance = 0`; el capital entra mediante `register_new_capital`.
- `envelopes.balance` debe coincidir con el capital neto atribuible al sobre mediante `envelope_id`.
- La redistribución mueve capital entre posiciones sin alterar el balance del sobre.
- Una salida de objetivo reduce tanto el capital de la posición como el balance del sobre.
- Un retiro de rendimiento no modifica el capital restante ni el balance del sobre.
- Las reversiones modernas usan operaciones dedicadas; los movimientos sensibles no se editan ni eliminan de forma genérica.
- La última valuación y sus movimientos posteriores se ordenan por `occurred_at`, `created_at` e `id`, con precisión temporal de milisegundos.

Los detalles de persistencia, concurrencia y permisos están documentados en [docs/database-notes.md](docs/database-notes.md).
