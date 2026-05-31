# Runbook: Tokko Panel Session Renewal

## Qué hace
Hace login en el panel privado de Tokko Broker usando Playwright (browser automation), captura las cookies + JWT Bearer post-login, y los guarda en la tabla `public.tokko_panel_session` de Supabase.

Esa tabla es leída por:
- Edge Functions de Supabase (`tokko-panel-sync` cron 5min)
- Scripts: `tokko-panel-backfill.mjs`, `backfill-inactive-inquiries.mjs`

Sin sesión fresca, todos esos jobs fallan con 401.

## Cuándo ejecutar
- **Cuando una Edge Function reporta sesión expirada** (revisar logs en Supabase Dashboard)
- **Semanalmente** como mantenimiento preventivo (las sesiones de Tokko panel duran ~7 días)
- Antes de correr `backfill-inactive-inquiries.mjs` si han pasado más de 5 días

Idealmente: configurar como **GitHub Action cron weekly**.

## Pre-requisitos

`.env.local` o `.env` con:

```env
TOKKO_PANEL_LOGIN_URL=https://www.tokkobroker.com/go/
TOKKO_PANEL_EMAIL=<email del usuario admin de Tokko>
TOKKO_PANEL_PASSWORD=<password>
NEXT_PUBLIC_SUPABASE_URL=https://yahsfzmlijrolyvhxnhw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Playwright instalado:
```bash
npx playwright install chromium
```

## Comandos

### Default (headless)

```bash
node scripts/tokko-panel-renew-session.mjs
```

### Headed (para debugging — ver el browser)

```bash
node scripts/tokko-panel-renew-session.mjs --headed
```

Útil cuando Tokko cambió el HTML y el script falla en algún selector.

## Output esperado

```
[xxx] Launching browser (headless)...
[xxx] Navigating to login page...
[xxx] Filling credentials...
[xxx] Clicking login button...
[xxx] Waiting for post-login redirect...
[xxx] Capturing cookies + JWT...
[xxx] Saving to tokko_panel_session...
[xxx] Done. Session valid until ~2026-06-15.
```

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `TOKKO_PANEL_EMAIL not set` | env var falta | Completar `.env.local` |
| `Timeout waiting for selector: #login` | Tokko cambió el HTML | Correr con `--headed`, identificar nuevo selector, actualizar script |
| `Captcha detected` | Tokko activó protección anti-bot | Login manual en el browser primero (cookie del browser quedará en local). Considerar usar `--headed` y dejar al user resolver el captcha. |
| `Supabase: insert failed` | Tabla `tokko_panel_session` falta o RLS bloquea service role | Verificar que el service role bypasse RLS y la tabla exista. Si fue dropped, revisar migrations. |

## Verificación post-run

```sql
SELECT
  created_at,
  expires_at,
  jsonb_array_length(cookies) as cookie_count,
  length(jwt) as jwt_length
FROM tokko_panel_session
ORDER BY created_at DESC
LIMIT 1;
```

Debería mostrar el row recién insertado con `created_at` ≈ ahora.

## Automatización (recomendado)

GitHub Action workflow (`.github/workflows/renew-tokko-session.yml`):

```yaml
name: Renew Tokko Panel Session
on:
  schedule:
    - cron: '0 6 * * 1'  # Lunes 6am UTC
  workflow_dispatch:
jobs:
  renew:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install
      - run: npx playwright install chromium
      - run: node scripts/tokko-panel-renew-session.mjs
        env:
          TOKKO_PANEL_EMAIL: ${{ secrets.TOKKO_PANEL_EMAIL }}
          TOKKO_PANEL_PASSWORD: ${{ secrets.TOKKO_PANEL_PASSWORD }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Estatus actual: **no configurado**. Pendiente decisión del user.
