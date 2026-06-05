-- Down migration: signature_templates + extend signature_submissions

drop trigger if exists trg_signature_templates_updated_at on public.signature_templates;
drop table if exists public.signature_templates;

alter table public.signature_submissions drop column if exists template_slug;
alter table public.signature_submissions drop column if exists signers_snapshot;
alter table public.signature_submissions drop column if exists doc_title;
