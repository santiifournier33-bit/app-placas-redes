import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)
}

export function getAuthUrl(state: string): string {
  const oauth2 = getOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.email"],
    state,
  })
}

export async function exchangeCode(code: string) {
  const oauth2 = getOAuth2Client()
  const { tokens } = await oauth2.getToken(code)
  return tokens
}

interface GoogleConnection {
  access_token: string
  refresh_token: string
  expires_at: string | null
  sync_token: string | null
}

async function getAuthedClient(connection: GoogleConnection) {
  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: connection.expires_at ? new Date(connection.expires_at).getTime() : undefined,
  })
  return oauth2
}

export async function syncCalendarForUser(userId: string): Promise<{ pulled: number; pushed: number }> {
  const supabase = getServiceClient()

  const { data: conn } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .single()

  if (!conn) return { pulled: 0, pushed: 0 }

  const oauth2 = await getAuthedClient(conn)
  const calendar = google.calendar({ version: "v3", auth: oauth2 })

  let pulled = 0
  let pushed = 0

  // Pull from Google → Supabase
  try {
    const listParams: {
      calendarId: string
      maxResults: number
      singleEvents: boolean
      orderBy: "startTime"
      syncToken?: string
      timeMin?: string
      timeMax?: string
    } = {
      calendarId: "primary",
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
    }
    if (conn.sync_token) {
      listParams.syncToken = conn.sync_token
    } else {
      const now = new Date()
      listParams.timeMin = new Date(now.getTime() - 30 * 86400000).toISOString()
      listParams.timeMax = new Date(now.getTime() + 365 * 86400000).toISOString()
    }

    const res = await calendar.events.list(listParams)
    const items = res.data.items ?? []

    for (const item of items) {
      if (!item.id || !item.summary) continue
      if (item.status === "cancelled") {
        await supabase
          .from("calendar_events")
          .update({ deleted_at: new Date().toISOString() })
          .eq("google_event_id", item.id)
          .eq("owner_id", userId)
        continue
      }

      const eventDate = item.start?.dateTime || item.start?.date || null
      const eventEnd = item.end?.dateTime || item.end?.date || null
      if (!eventDate) continue

      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("google_event_id", item.id)
        .eq("owner_id", userId)
        .maybeSingle()

      if (existing) {
        await supabase.from("calendar_events").update({
          title: item.summary,
          description: item.description || null,
          event_date: eventDate,
          event_end: eventEnd,
          last_synced_at: new Date().toISOString(),
        }).eq("id", existing.id)
      } else {
        await supabase.from("calendar_events").insert({
          owner_id: userId,
          title: item.summary,
          description: item.description || null,
          event_date: eventDate,
          event_end: eventEnd,
          event_type: "reunion",
          google_event_id: item.id,
          google_calendar_id: "primary",
          last_synced_at: new Date().toISOString(),
        })
      }
      pulled++
    }

    if (res.data.nextSyncToken) {
      await supabase
        .from("google_calendar_connections")
        .update({ sync_token: res.data.nextSyncToken })
        .eq("id", conn.id)
    }
  } catch (err: unknown) {
    const status = (err as { code?: number }).code
    if (status === 410) {
      await supabase
        .from("google_calendar_connections")
        .update({ sync_token: null })
        .eq("id", conn.id)
    }
  }

  // Push from Supabase → Google (events without google_event_id)
  const { data: unpushed } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("owner_id", userId)
    .is("google_event_id", null)
    .is("deleted_at", null)

  for (const ev of unpushed ?? []) {
    try {
      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: ev.title,
          description: ev.description || undefined,
          start: { dateTime: ev.event_date },
          end: { dateTime: ev.event_end || ev.event_date },
        },
      })
      if (res.data.id) {
        await supabase.from("calendar_events").update({
          google_event_id: res.data.id,
          google_calendar_id: "primary",
          last_synced_at: new Date().toISOString(),
        }).eq("id", ev.id)
        pushed++
      }
    } catch {}
  }

  // Refresh tokens if needed
  const newCreds = oauth2.credentials
  if (newCreds.access_token !== conn.access_token) {
    await supabase.from("google_calendar_connections").update({
      access_token: newCreds.access_token!,
      expires_at: newCreds.expiry_date ? new Date(newCreds.expiry_date).toISOString() : null,
    }).eq("id", conn.id)
  }

  return { pulled, pushed }
}

interface TaskSyncPayload {
  id: string
  title: string
  description: string | null
  due_date: string | null
  due_time: string | null
  google_event_id: string | null
  google_calendar_id: string | null
}

function taskToEventBody(task: TaskSyncPayload) {
  if (!task.due_date) return null
  const hasTime = !!task.due_time
  const startISO = hasTime
    ? `${task.due_date}T${task.due_time}:00`
    : task.due_date

  const start = hasTime ? { dateTime: startISO } : { date: task.due_date }
  const end = hasTime
    ? { dateTime: startISO }
    : { date: task.due_date }

  return {
    summary: `[Tarea] ${task.title}`,
    description: task.description || undefined,
    start,
    end,
  }
}

export async function pushTaskToGoogle(userId: string, taskId: string): Promise<boolean> {
  const supabase = getServiceClient()

  const { data: conn } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .single()
  if (!conn) return false

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, due_time, google_event_id, google_calendar_id")
    .eq("id", taskId)
    .eq("owner_id", userId)
    .single()
  if (!task) return false

  const body = taskToEventBody(task as TaskSyncPayload)
  if (!body) {
    // No due_date — if there's an existing Google event, remove it
    if (task.google_event_id) {
      await removeTaskFromGoogle(userId, taskId)
    }
    return false
  }

  const oauth2 = await getAuthedClient(conn)
  const calendar = google.calendar({ version: "v3", auth: oauth2 })

  try {
    if (task.google_event_id) {
      await calendar.events.update({
        calendarId: task.google_calendar_id || "primary",
        eventId: task.google_event_id,
        requestBody: body,
      })
    } else {
      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: body,
      })
      if (res.data.id) {
        await supabase.from("tasks").update({
          google_event_id: res.data.id,
          google_calendar_id: "primary",
          last_synced_at: new Date().toISOString(),
        }).eq("id", taskId)
      }
    }
    return true
  } catch (err) {
    console.error("pushTaskToGoogle failed", err)
    return false
  }
}

export async function removeTaskFromGoogle(userId: string, taskId: string): Promise<boolean> {
  const supabase = getServiceClient()

  const { data: conn } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .single()
  if (!conn) return false

  const { data: task } = await supabase
    .from("tasks")
    .select("google_event_id, google_calendar_id")
    .eq("id", taskId)
    .eq("owner_id", userId)
    .single()
  if (!task?.google_event_id) return false

  const oauth2 = await getAuthedClient(conn)
  const calendar = google.calendar({ version: "v3", auth: oauth2 })

  try {
    await calendar.events.delete({
      calendarId: task.google_calendar_id || "primary",
      eventId: task.google_event_id,
    })
    await supabase.from("tasks").update({
      google_event_id: null,
      last_synced_at: new Date().toISOString(),
    }).eq("id", taskId)
    return true
  } catch (err) {
    console.error("removeTaskFromGoogle failed", err)
    return false
  }
}
