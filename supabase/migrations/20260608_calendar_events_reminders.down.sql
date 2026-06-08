-- Revierte 20260608_calendar_events_reminders.sql
DROP INDEX IF EXISTS idx_calendar_events_due_reminders;

ALTER TABLE public.calendar_events
  DROP COLUMN IF EXISTS reminder_at,
  DROP COLUMN IF EXISTS reminder_sent_at;
