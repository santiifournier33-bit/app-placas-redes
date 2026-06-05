-- F6 — merge_contacts(p_primary, p_secondary): combina dos contactos en uno.
-- Reasigna todas las FK del secundario al primario (con dedup para no violar uniques
-- de emails/phones/pipelines/inquiries), completa los campos vacíos del primario desde
-- el secundario, fusiona tags/flags, y soft-deletea el secundario.
-- La verificación de permisos (owner/admin) se hace en la ruta /api/contacts/merge.
-- Aplicada en remoto como migración contacts_merge_function.

create or replace function merge_contacts(p_primary uuid, p_secondary uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_primary = p_secondary then
    raise exception 'No se puede combinar un contacto consigo mismo';
  end if;

  delete from contact_emails se where se.contact_id = p_secondary
    and exists (select 1 from contact_emails pe where pe.contact_id = p_primary and pe.email = se.email);
  update contact_emails set contact_id = p_primary where contact_id = p_secondary;

  delete from contact_phones sp where sp.contact_id = p_secondary
    and exists (select 1 from contact_phones pp where pp.contact_id = p_primary and pp.phone = sp.phone);
  update contact_phones set contact_id = p_primary where contact_id = p_secondary;

  delete from contact_pipelines scp where scp.contact_id = p_secondary
    and exists (select 1 from contact_pipelines pcp where pcp.contact_id = p_primary and pcp.pipeline_id = scp.pipeline_id);
  update contact_pipelines set contact_id = p_primary where contact_id = p_secondary;

  delete from inquiries si where si.contact_id = p_secondary
    and exists (select 1 from inquiries pi where pi.contact_id = p_primary and pi.tokko_property_id = si.tokko_property_id);
  update inquiries set contact_id = p_primary where contact_id = p_secondary;

  update contact_notes set contact_id = p_primary where contact_id = p_secondary;
  update contact_activity_log set contact_id = p_primary where contact_id = p_secondary;
  update tasks set contact_id = p_primary where contact_id = p_secondary;
  update tasaciones set contact_id = p_primary where contact_id = p_secondary;

  update contacts p set
    last_name         = coalesce(p.last_name, s.last_name),
    primary_phone     = coalesce(p.primary_phone, s.primary_phone),
    primary_email     = coalesce(p.primary_email, s.primary_email),
    rol               = coalesce(p.rol, s.rol),
    tipo              = coalesce(p.tipo, s.tipo),
    cercania          = coalesce(p.cercania, s.cercania),
    contexto          = coalesce(p.contexto, s.contexto),
    ubicacion         = coalesce(p.ubicacion, s.ubicacion),
    circulo           = coalesce(p.circulo, s.circulo),
    category          = coalesce(p.category, s.category),
    notes             = coalesce(nullif(p.notes, ''), s.notes),
    last_contact_date = greatest(p.last_contact_date, s.last_contact_date),
    es_estrategico    = coalesce(p.es_estrategico, false) or coalesce(s.es_estrategico, false),
    es_influyente     = coalesce(p.es_influyente, false) or coalesce(s.es_influyente, false),
    es_mentor         = coalesce(p.es_mentor, false) or coalesce(s.es_mentor, false),
    tags              = (select array(select distinct e from unnest(coalesce(p.tags,'{}') || coalesce(s.tags,'{}')) e)),
    updated_at        = now()
  from contacts s
  where p.id = p_primary and s.id = p_secondary;

  update contacts set deleted_at = now(), updated_at = now() where id = p_secondary;
end;
$$;
