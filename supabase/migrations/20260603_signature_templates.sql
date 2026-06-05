-- Migration: signature_templates + extend signature_submissions
-- Plantillas de firma editables (Opción B: cuerpo dinámico por N firmantes).
-- Accedido SOLO via service-role (rutas API). RLS habilitada, sin policies =>
-- anon/authenticated bloqueados; la service-role key bypassa RLS. La autorización
-- de edición (solo admin) se valida en el route contra la sesión.
-- Proyecto: yahsfzmlijrolyvhxnhw (APP FREIRE FINAL).

create table if not exists public.signature_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  body_html text not null,
  variables jsonb not null default '[]'::jsonb,
  signer_roles jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_signature_templates_slug on public.signature_templates (slug);

alter table public.signature_templates enable row level security;

-- Reusa el trigger set_updated_at() creado en la migración del funnel tracker.
drop trigger if exists trg_signature_templates_updated_at on public.signature_templates;
create trigger trg_signature_templates_updated_at before update on public.signature_templates
  for each row execute function public.set_updated_at();

-- Extender signature_submissions (puntero existente) con snapshot para el listado.
alter table public.signature_submissions add column if not exists template_slug text;
alter table public.signature_submissions add column if not exists signers_snapshot jsonb;
alter table public.signature_submissions add column if not exists doc_title text;

-- Seed: Autorización de comercialización (v1).
-- Encabezado, intro, ASENTIMIENTO, cláusula NOVENO y cierre/firmas están tomados
-- verbatim del modelo Freire. Las cláusulas PRIMERO..OCTAVO van como placeholders
-- ([[CLAUSULA_*]] / comentarios) y deben completarse con el texto legal exacto.
insert into public.signature_templates (slug, name, body_html, variables, signer_roles)
values (
  'autorizacion-comercializacion',
  'Autorización de comercialización',
  $html$
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.5; color: #111; max-width: 720px; margin: 0 auto;">

  <div style="text-align:center; margin-bottom: 16px;">
    <img src="[[logo_url]]" alt="Freire Propiedades" style="height: 70px;" />
    <h2 style="margin: 8px 0; letter-spacing: .5px;">AUTORIZACIÓN DE COMERCIALIZACIÓN</h2>
  </div>

  <p style="text-align: justify;">
    Entre [[#propietarios]][[^_first]]; y por la otra parte el/la Sr./Sra. [[/_first]]el/la Sr./Sra.
    <strong>[[nombre]]</strong>, DNI Nº [[dni]], con domicilio en [[domicilio]], Localidad [[localidad]],
    Partido [[partido]], Provincia de Buenos Aires, estado civil [[estado_civil]], teléfono [[telefono]],
    correo electrónico [[email]][[/propietarios]], en adelante denominado el &ldquo;AUTORIZANTE&rdquo;,
    por una parte, y por la otra <strong>FREIRE Negocios Inmobiliarios</strong>, representada por la
    martillera Stella Maris Freire, matrícula Nº 6142 CMCPSI, en adelante denominado el
    &ldquo;AUTORIZADO&rdquo;, convienen celebrar la presente autorización de comercialización sujeta a
    las siguientes cláusulas y condiciones:
  </p>

  [[#conyuges]]
  <p style="text-align: justify;">
    <strong>ASENTIMIENTO:</strong> El/la Sr./Sra. <strong>[[nombre]]</strong>, en su carácter de
    [[caracter]], presta su asentimiento expreso para la realización de la operación encomendada,
    conforme lo dispuesto por la normativa vigente.
  </p>
  [[/conyuges]]

  <!-- TODO(usuario): pegar el texto verbatim de las cláusulas PRIMERO..OCTAVO.
       Variables disponibles para incrustar dentro de ellas:
       Propiedad: [[domicilio_propiedad]], [[localidad_propiedad]], [[partido_propiedad]],
                  [[partida_inmobiliaria]], [[afectacion]], [[apto_credito]]
       Precio:    [[precio_numeros]] (en números), [[precio_palabras]] (en palabras)
       Exclusiva: [[dias_exclusiva_numeros]] / [[dias_exclusiva_palabras]],
                  [[fecha_inicio]] a [[fecha_fin]] -->

  <p style="text-align: justify;">
    <strong>PRIMERO – PRECIO:</strong> El precio de venta del inmueble se fija en la suma de DÓLARES
    ESTADOUNIDENSES [[precio_numeros]] (USD [[precio_palabras]]). <em>[Completar redacción exacta.]</em>
  </p>
  <p style="text-align: justify;">
    <strong>SEGUNDO – EXCLUSIVIDAD:</strong> Se otorga por el plazo de [[dias_exclusiva_numeros]]
    ([[dias_exclusiva_palabras]]) días, desde el [[fecha_inicio]] hasta el [[fecha_fin]].
    <em>[Completar redacción exacta.]</em>
  </p>
  <p style="text-align: justify;"><em>[TERCERO..OCTAVO — pegar texto verbatim.]</em></p>

  <p style="text-align: justify;">
    <strong>NOVENO – DOMICILIOS:</strong> A todos los efectos legales derivados del presente, las partes
    constituyen domicilios especiales en los indicados precedentemente, y el AUTORIZADO en el domicilio
    sito en &ldquo;Edificio STUDIOS Work&amp;Live, Las Amapolas 475, Pilar, Provincia de Buenos Aires.
    Piso 2. Oficina 220.&rdquo;, donde serán válidas todas las notificaciones judiciales y extrajudiciales
    que se cursen.
  </p>

  <p style="text-align: justify; margin-top: 16px;">
    En prueba de conformidad, se firman [[ejemplares_numero]] ([[ejemplares_palabra]]) ejemplares de un
    mismo tenor y a un solo efecto, en la Ciudad de [[ciudad_firma]], a los [[dia]] días del mes de
    [[mes]] del año [[anio]].
  </p>

  <table style="width:100%; margin-top: 48px; border-collapse: collapse;">
    <tr>
      <td style="width:50%; vertical-align: top; padding-right: 16px;">
        [[#firmantes]]
        <div style="margin-bottom: 28px;">
          [[firma]]
          <div style="border-top:1px solid #000; padding-top:4px; font-size:9pt;">
            [[nombre]] — [[rol_label]]
          </div>
        </div>
        [[/firmantes]]
      </td>
      <td style="width:50%; vertical-align: top; padding-left: 16px;">
        [[#corredor]]
        <div>
          [[firma]]
          <div style="border-top:1px solid #000; padding-top:4px; font-size:9pt;">
            [[nombre]] — CORREDOR INMOBILIARIO
          </div>
        </div>
        [[/corredor]]
      </td>
    </tr>
  </table>

</div>
  $html$,
  '[]'::jsonb,
  '{
    "propietario": { "repeatable": true, "min": 1, "label": "PROPIETARIO", "role_prefix": "Propietario" },
    "conyuge":     { "repeatable": true, "min": 0, "label": "CÓNYUGE", "role_prefix": "Conyuge", "signs": true },
    "corredor":    { "fixed": true, "label": "CORREDOR INMOBILIARIO", "role": "Corredor" }
  }'::jsonb
)
on conflict (slug) do nothing;
