-- Q4: recordatorios de eventos de calendario.
-- Replica el mecanismo de recordatorios de `tasks` sobre `calendar_events` para que
-- el dispatcher programado (netlify/functions/send-task-reminders.ts) también pueda
-- disparar push de eventos. `reminder_at` = instante UTC en que avisar;
-- `reminder_sent_at` = marca de idempotencia (se setea al despachar).

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Índice parcial: mantiene el índice chico (solo recordatorios no enviados de
-- eventos vivos). Mismo patrón que idx_tasks_due_reminders.
CREATE INDEX IF NOT EXISTS idx_calendar_events_due_reminders
  ON public.calendar_events (reminder_at)
  WHERE reminder_sent_at IS NULL
    AND deleted_at IS NULL;
