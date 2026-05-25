# Gmail Zonaprop enrichment — setup n8n workflow

Endpoint: `POST /api/inquiries/zonaprop-enrich`
HMAC secret: `INBOUND_WEBHOOK_SECRET` env var

## n8n workflow recipe

### Node 1: Gmail Trigger
- Authentication: OAuth2 (account `freirepropiedadespilar@gmail.com`)
- Event: `messageReceived`
- Filters:
  - `From: usuarios.zonaprop.com.ar OR email.zonaprop.com.ar`
  - `Subject: CÓD:`
- Poll: every 5 min

### Node 2: Function (compute HMAC)
```js
import crypto from 'node:crypto'
const SECRET = $env.INBOUND_WEBHOOK_SECRET
const subject = $json.subject
const html = $json.body || $json.payload?.body?.data || ''  // base64-decoded if needed
const receivedAt = $json.internalDate
  ? new Date(Number($json.internalDate)).toISOString()
  : new Date().toISOString()
const body = JSON.stringify({
  subject,
  html_body: html,
  received_at: receivedAt,
  gmail_message_id: $json.id,
})
const signature = crypto.createHmac('sha256', SECRET).update(body).digest('hex')
return [{ json: { body, signature } }]
```

### Node 3: HTTP Request
- Method: POST
- URL: `https://app-interna-freire.netlify.app/api/inquiries/zonaprop-enrich`
- Headers:
  - `Content-Type: application/json`
  - `x-signature: {{ $json.signature }}`
- Body: Raw / JSON: `{{ $json.body }}`

### Node 4: Gmail Label (optional)
Apply label "Procesado por CRM" para dedup.

## Backfill histórico

Workflow separado "manual trigger":
- Gmail Search: `from:zonaprop.com.ar subject:"CÓD:" before:2026/05/21`
- Loop con paginación (Gmail API pageToken)
- Mismos nodos 2 + 3
- Procesa todo el histórico una vez

## Verificación
Test endpoint con curl:
```bash
BODY='{"subject":"CÓD:FAP7674529 - REF:#305935722#","html_body":"...","received_at":"2026-05-19T20:38:00Z"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$INBOUND_WEBHOOK_SECRET" -hex | cut -d' ' -f2)
curl -X POST https://app-interna-freire.netlify.app/api/inquiries/zonaprop-enrich \
  -H "Content-Type: application/json" \
  -H "x-signature: $SIG" \
  -d "$BODY"
```

Response esperado:
```json
{"ok":true,"inquiry_id":"...","reference_code":"FAP7674529","preferences_keys":["operation_type","property_type","price_min","price_max","currency","zones","bedrooms_min",...]}
```
