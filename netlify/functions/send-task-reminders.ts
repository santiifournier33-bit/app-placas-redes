// Scheduled reminder dispatcher (tasks + calendar events).
//
// The app lets users set `reminder_at` on a task OR a calendar event and
// subscribe to web-push, but nothing fired the notification — `reminder_sent_at`
// was never set. This job closes that gap: every minute it finds tasks and
// events whose reminder is due and pushes a notification via the existing
// `sendPushToUser` (src/lib/push/server.ts).
//
// Notes: Netlify scheduled functions only run on published PRODUCTION deploys,
// run in UTC, and have a 30s timeout. `reminder_at` is stored as ISO UTC, so the
// `<= now()` comparison is timezone-correct. The `@/` alias does NOT resolve in
// the function bundle, hence the relative import below.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { sendPushToUser } from "../../src/lib/push/server"

type DueRow = { id: string; owner_id: string; title: string | null }

// Dispatch due reminders for one table. Returns how many rows were processed.
// Marking processed is idempotent (sets reminder_sent_at) so a user with no
// active subscription is not re-queried every tick forever.
async function dispatchDue(
  supabase: SupabaseClient,
  table: "tasks" | "calendar_events",
  rows: DueRow[],
  url: string,
  nowIso: string,
): Promise<number> {
  if (rows.length === 0) return 0

  const processedIds: string[] = []
  for (const r of rows) {
    try {
      await sendPushToUser(r.owner_id, {
        title: "Recordatorio",
        body: r.title || (table === "tasks" ? "Tenés una tarea pendiente" : "Tenés un evento agendado"),
        url,
      })
    } catch {
      // Best-effort: a failed push must not block the rest of the batch.
      console.error(`[send-task-reminders] push failed for ${table}`, r.id)
    }
    processedIds.push(r.id)
  }

  const { error } = await supabase
    .from(table)
    .update({ reminder_sent_at: nowIso })
    .in("id", processedIds)
  if (error) {
    console.error(`[send-task-reminders] mark sent failed (${table}):`, error.message)
  }
  return processedIds.length
}

export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("[send-task-reminders] missing Supabase env")
    return new Response("missing supabase env", { status: 500 })
  }

  const supabase = createClient(url, key)
  const nowIso = new Date().toISOString()

  // Tasks due = reminder passed, not yet sent, task still open.
  const { data: dueTasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("id, owner_id, title")
    .lte("reminder_at", nowIso)
    .is("reminder_sent_at", null)
    .eq("completed", false)
    .is("deleted_at", null)
    .limit(200)

  // Events due = reminder passed, not yet sent, event not deleted.
  const { data: dueEvents, error: eventsErr } = await supabase
    .from("calendar_events")
    .select("id, owner_id, title")
    .lte("reminder_at", nowIso)
    .is("reminder_sent_at", null)
    .is("deleted_at", null)
    .limit(200)

  if (tasksErr) console.error("[send-task-reminders] tasks query failed:", tasksErr.message)
  if (eventsErr) console.error("[send-task-reminders] events query failed:", eventsErr.message)

  const taskCount = await dispatchDue(supabase, "tasks", (dueTasks as DueRow[]) ?? [], "/productividad/tareas", nowIso)
  const eventCount = await dispatchDue(supabase, "calendar_events", (dueEvents as DueRow[]) ?? [], "/productividad/calendario", nowIso)

  return new Response(`processed ${taskCount} task + ${eventCount} event reminders`)
}

export const config = {
  // Every minute — reminders should fire promptly after their due time.
  schedule: "* * * * *",
}
