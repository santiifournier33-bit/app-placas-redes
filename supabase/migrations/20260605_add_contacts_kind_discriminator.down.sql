-- Rollback de la separación Contacto vs Inquiry.
-- Reversible: el backfill no es recuperable por columna, pero el backup vivo
-- contacts_backup_kind_20260605 conserva el estado previo si hiciera falta.

drop index if exists idx_contacts_owner_kind;
alter table contacts drop column if exists kind;
