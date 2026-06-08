-- Partial index for the scheduled task-reminder dispatcher
-- (netlify/functions/send-task-reminders.ts), which runs every minute querying:
--   reminder_at <= now() AND reminder_sent_at IS NULL AND completed = false AND deleted_at IS NULL
-- The partial predicate keeps the index tiny (only un-sent, open, pending reminders).

CREATE INDEX IF NOT EXISTS idx_tasks_due_reminders
  ON public.tasks (reminder_at)
  WHERE reminder_sent_at IS NULL
    AND completed = false
    AND deleted_at IS NULL;
