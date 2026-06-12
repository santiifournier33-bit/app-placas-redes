// Web-push subscription helpers.
//
// Design notes (why this shape):
// - `subscribeToPush` returns a TYPED result instead of swallowing errors, so the
//   UI can tell "user denied" from "save failed" from "missing VAPID" and never
//   nags blindly.
// - It REUSES an existing `pushManager` subscription instead of always creating a
//   new endpoint. Re-subscribing churned a new DB row every time (endpoints rotate),
//   leaving stale rows that later 410 and get deleted — silently killing reminders.
// - It can run WITHOUT prompting (`requestPermission: false`) so the app can
//   silently re-attach a subscription when permission is already granted.

export type SubscribeReason =
  | "unsupported"
  | "no-vapid"
  | "denied"
  | "default" // permission still undecided (user dismissed the OS prompt)
  | "subscribe-failed"
  | "save-failed"

export type SubscribeResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: SubscribeReason }

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    return await navigator.serviceWorker.register("/sw.js")
  } catch {
    return null
  }
}

/** The subscription this browser already holds for our app, if any. */
export async function getExistingSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

/** Persist a subscription server-side (idempotent upsert by owner+endpoint). */
async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
        auth: arrayBufferToBase64(sub.getKey("auth")),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Ensure this browser is subscribed and the server knows about it.
 * @param requestPermission when false, never shows the OS prompt — used to
 *   silently (re-)attach a subscription when permission is already granted.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  { requestPermission = true }: { requestPermission?: boolean } = {}
): Promise<SubscribeResult> {
  if (!("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" }
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return { ok: false, reason: "no-vapid" }

  let permission = Notification.permission
  if (permission === "default" && requestPermission) {
    permission = await Notification.requestPermission()
  }
  if (permission !== "granted") {
    return { ok: false, reason: permission === "denied" ? "denied" : "default" }
  }

  // Reuse the existing subscription when present — avoids minting a new endpoint
  // (and a duplicate DB row) on every call.
  let subscription = await getExistingSubscription(registration)
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
    } catch {
      return { ok: false, reason: "subscribe-failed" }
    }
  }

  const saved = await saveSubscription(subscription)
  if (!saved) return { ok: false, reason: "save-failed" }

  return { ok: true, subscription }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported"
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ""
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
