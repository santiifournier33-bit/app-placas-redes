-- Separación Contacto vs Inquiry: discriminador `kind` en contacts.
-- 'personal' = red personal del usuario (módulo Contactos).
-- 'lead'     = identidad de un interesado que consultó (ingesta automática); solo visible en Consultas.
-- IMPORTANTE: el Matching, la dedup de ingesta y el kanban NUNCA filtran por kind (leen toda la tabla).
-- Doc: docs/ARQUITECTURA-CONTACTOS-INQUIRIES.md
-- Aplicada en remoto como migración 20260605150557_add_contacts_kind_discriminator.

alter table contacts
  add column if not exists kind text not null default 'personal'
  check (kind in ('personal', 'lead'));

-- Backfill one-time: todos los registros existentes eran lead-origin
-- (source portal/tokko/web, 0 curados, 99.4% con inquiry asociada).
update contacts set kind = 'lead';

create index if not exists idx_contacts_owner_kind
  on contacts (owner_id, kind) where deleted_at is null;
