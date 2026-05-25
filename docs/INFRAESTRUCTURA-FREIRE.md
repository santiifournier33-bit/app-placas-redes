# Infraestructura Freire Propiedades — Accesos y servicios

> Documento para referencia futura. Mantener actualizado cuando se agreguen/cambien servicios.

## Servidor principal — Oracle Cloud

- **Provider:** Oracle Cloud Infrastructure (OCI)
- **Servicios alojados:** n8n (workflow automation), posiblemente otros containers Docker
- **Acceso SSH:** _Pendiente: completar IP/dominio + ruta de la key SSH_

### Cómo entrar al server

1. Ir a Oracle Cloud Console: https://cloud.oracle.com/
2. Login con cuenta admin de la inmobiliaria
3. Compute → Instances → seleccionar la instance de la inmobiliaria
4. Anotar la "Public IP" de la instance
5. SSH desde Windows (Git Bash o WSL):
   ```bash
   ssh -i ~/.ssh/<key-name>.pem ubuntu@<PUBLIC_IP>
   ```
   La key SSH viene del momento del setup inicial de la VM. Si no está local, descargar desde OCI Console → Compute → Instances → Details → "View SSH key" o regenerar.

### Listar containers Docker corriendo

Una vez dentro del server por SSH:
```bash
docker ps
docker ps -a   # incluye detenidos
```
Esperado: ver al menos un container n8n.

### Acceder al container n8n

```bash
docker exec -it <n8n-container-name> sh
```

---

## n8n

- **URL editor:** _Pendiente: completar_ (probable `http://<PUBLIC_IP>:5678/` o subdominio custom)
- **Login:** _Pendiente: completar usuario + contraseña_
- **Versión:** _Pendiente: verificar Help → About en el editor_

### Generar API Key (necesaria para deployar workflows automáticamente)

1. Abrir el editor n8n en browser
2. Top right → user icon → **Settings**
3. Tab **API**
4. Click **Create new API key**
5. Copiar el token completo (se muestra una sola vez) y guardar:
   ```
   N8N_API_URL=https://<tu-n8n-url>/api/v1
   N8N_API_KEY=<el-token-largo>
   ```

### Credentials Gmail OAuth en n8n

1. Settings → **Credentials**
2. Buscar credential tipo "Gmail OAuth2"
3. Si existe: anotar nombre exacto. Si no existe: hay que crear

#### Crear Gmail OAuth credential (si no existe)

1. **Google Cloud Console:** https://console.cloud.google.com/
2. Crear proyecto nuevo (o usar uno existente)
3. APIs & Services → **Library** → buscar "Gmail API" → **Enable**
4. APIs & Services → **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: agregar la URL que n8n te pide (formato `<n8n-url>/rest/oauth2-credential/callback`)
7. Copiar **Client ID** + **Client Secret**
8. Volver a n8n → Credentials → New → Gmail OAuth2
9. Pegar Client ID + Secret → **Sign in with Google** → usar `freirepropiedadespilar@gmail.com`
10. Guardar con nombre "Gmail Freire"

---

## Supabase

- **Project:** APP FREIRE FINAL
- **URL:** `https://yahsfzmlijrolyvhxnhw.supabase.co`
- **Region:** us-west-1
- **Service role key:** en `.env.local` del proyecto (gitignored)
- **Edge Functions activas:**
  - `tokko-sync-contacts` (cron desactivado actualmente — solo manual)
  - `tokko-sync-users` (cron cada hora)
  - `tokko-retry-failures` (cron cada hora :30)
  - `sla-check-inquiries` (cron cada 10min)
  - `tokko-panel-sync` (cron cada 5min — scrape webcontacts)
  - `debug-env` (debug, eliminable)

---

## Netlify (deploys)

- **app-placas-redes (CRM interno):** `https://app-interna-freire.netlify.app/` (futuro production)
- **freire-web-moderna (sitio público):** `https://www.freirepropiedades.com/` (Netlify)

---

## Cuentas externas

| Servicio | Email/User | Notas |
|----------|-----------|-------|
| Tokko Broker (panel + API) | `freirepropiedadespilar@gmail.com` | API key en .env. Sin 2FA |
| Gmail principal | `freirepropiedadespilar@gmail.com` | Recibe leads Argenprop + Zonaprop |
| DocuSeal | Self-hosted | URL en .env |
| Brevo | OAuth con cuenta admin | API key en server vars |
| Resend | API key en server | |

---

## Workflows n8n (a deployar)

### `gmail-zonaprop-enrich` (cron 5min)
Captura emails de Zonaprop, extrae preferencias del usuario, las manda al CRM.

### `tokko-cookie-renew` (cron weekly)
Login Playwright headless en Tokko panel cada lunes, guarda cookies frescas en Supabase.

### `gmail-zonaprop-backfill` (manual trigger)
One-shot: procesa todos los emails históricos de Zonaprop en Gmail.
