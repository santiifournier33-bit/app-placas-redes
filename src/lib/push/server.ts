import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:freirepropiedadespilar@gmail.com"

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return 0
  const supabase = getServiceClient()
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh_key, auth_key, id")
    .eq("owner_id", userId)

  if (!subs || subs.length === 0) return 0

  let sent = 0
  const staleIds: string[] = []

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        },
        JSON.stringify(payload),
        { TTL: 86400 }
      )
      sent++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        staleIds.push(sub.id)
      }
    }
  }

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds)
  }

  return sent
}

export async function sendPushToAllActive(payload: PushPayload): Promise<number> {
  const supabase = getServiceClient()
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_active", true)

  if (!profiles) return 0

  let total = 0
  for (const p of profiles) {
    total += await sendPushToUser(p.id, payload)
  }
  return total
}
