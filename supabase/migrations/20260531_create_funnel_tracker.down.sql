-- Down migration: create_funnel_tracker
-- Reverses 20260531_create_funnel_tracker.sql
-- NOTE: set_updated_at() is left in place — it may be shared by other tables.

drop trigger if exists trg_funnel_activities_updated_at on public.funnel_activities;
drop trigger if exists trg_funnel_goals_updated_at on public.funnel_goals;

drop table if exists public.funnel_activities;
drop table if exists public.funnel_goals;
