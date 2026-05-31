# Variables de Entorno — app-placas-redes

Copiar a `.env.local` para desarrollo. Todos los valores son requeridos salvo que indique `(opcional)`.

## Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Auth (JWT session)

```env
JWT_SECRET=min-32-chars-random-string
```

## Google / Gmail OAuth2

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback
```

## Gemini (Google Generative AI)

```env
GEMINI_API_KEY=AIza...
```

## Tokko Broker

```env
TOKKOBROKER_API_KEY=xxxx
TOKKOBROKER_BASE_URL=https://tokkobroker.com/api/v1
```

## Zernio (Social Media Publishing)

```env
ZERNIO_API_KEY=xxxx
```

## AWS (Remotion video rendering)

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxx
AWS_REGION=us-east-1
AWS_LAMBDA_FUNCTION_NAME=remotion-render-xxxx
AWS_S3_BUCKET=freire-videos
```

## DocuSeal (E-Signatures)

```env
DOCUSEAL_API_KEY=xxxx
DOCUSEAL_BASE_URL=https://docuseal.tudominio.com
```

## Brevo (Email transaccional)

```env
BREVO_API_KEY=xkeysib-xxxx
```

## Web Push — PWA Notifications (opcional, funcionalidad en desarrollo)

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=xxxx
VAPID_EMAIL=mailto:tu@email.com
```

## Inquiries Webhook HMAC

```env
INQUIRIES_WEBHOOK_SECRET=xxxx
```

## n8n (Workflow automation)

```env
N8N_BASE_URL=https://n8n.tudominio.com
N8N_API_KEY=xxxx
```

## Gmail IMAP (scripts de backfill)

```env
GMAIL_IMAP_USER=freirepropiedadespilar@gmail.com
GMAIL_IMAP_PASS=xxxx   # Google App Password (sin espacios)
```

## GHL — GoHighLevel (si aplica)

```env
GHL_LOCATION_ID=vLeAYUiyvUMIhRMyjWtd
GHL_API_KEY=xxxx
```

---

## Cómo generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

## Cómo obtener Supabase service role key

Dashboard Supabase → Project Settings → API → `service_role` key.

**NUNCA exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente.** Solo usar en server routes.
