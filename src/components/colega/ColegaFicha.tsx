// Ficha pública "modo colegas": réplica del layout de ficha.info (Tokko) en tema claro,
// mostrando los datos del inmueble SIN asesor, inmobiliaria, branding ni contacto.
// Server component; galería/multimedia y descripción expandible viven en componentes client.
// Las props ya vienen depuradas desde la ruta (nunca producer/branch/broker/agent).
import { ColegaGallery } from "./ColegaGallery";
import { ColegaDescription } from "./ColegaDescription";
import type { NormalizedMedia } from "@/lib/colega/media";

type Tag = { name: string; type: number };

export interface ColegaProperty {
  type: string;
  operation_type: string;
  price: string;
  reference_code: string;
  address: string;
  location: string;
  full_location: string;
  description: string;
  surface_total: number;
  surface_covered: number;
  surface_uncovered: number;
  surface_semicovered: number;
  surface_land: number;
  front_measure: number;
  depth_measure: number;
  rooms: number;
  bathrooms: number;
  bedrooms: number;
  parking: number;
  orientation: string;
  age: number;
  expenses: number;
  geo_lat: number | null;
  geo_long: number | null;
  photos: string[];
  tags: Tag[];
}

const fm = (n: number) => Number(n).toLocaleString("es-AR");
const m2 = (n: number) => (n ? `${fm(n)} m²` : null);

// ── Iconos inline (alternativa al icon-font propio de Tokko, no accesible) ──
const ICON = "h-5 w-5 text-[#1f6feb]";
const IconSurface = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z" /><path d="M3 9h4M3 15h4M9 3v4M15 3v4" /></svg>
);
const IconRoofed = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
);
const IconRooms = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 12h18M12 4v16" /></svg>
);
const IconBed = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" /><path d="M3 18h18M3 14h18M7 10V8a2 2 0 0 1 2-2h2v4" /></svg>
);
const IconBath = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M6 12V6a2 2 0 0 1 4 0" /><path d="M8 19l-1 2M17 19l1 2" /></svg>
);
const IconAge = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const IconCar = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13" /><path d="M5 13h14v4H5zM7 17v2M17 17v2" /><circle cx="7.5" cy="15" r="0.6" /><circle cx="16.5" cy="15" r="0.6" /></svg>
);
const IconPin = () => (
  <svg className="h-4 w-4 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
const IconCheck = () => (
  <svg className="h-4 w-4 text-[#1aa564] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6" /></svg>
);
const IconExternal = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
);

function AttrChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-3 min-w-[88px] rounded-xl bg-[#F7F9FB] border border-[#eceff3]">
      {icon}
      <span className="text-[13px] font-medium text-[#2b3440] text-center leading-tight">{value}</span>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1b2733]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2.5">
      {items.map((t, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-[#3c4753]">
          <IconCheck />
          {t}
        </div>
      ))}
    </div>
  );
}

export function ColegaFicha({ property, media }: { property: ColegaProperty; media?: NormalizedMedia }) {
  const tagsByType = (type: number) =>
    (property.tags || []).filter((t) => t.type === type).map((t) => t.name);
  const servicios = tagsByType(1);
  const ambientes = tagsByType(2);
  const adicionales = tagsByType(3);

  // Atributos con icono (fila superior)
  const attrs = [
    property.surface_total && { icon: <IconSurface />, value: `${fm(property.surface_total)} m² tot.` },
    property.surface_covered && { icon: <IconRoofed />, value: `${fm(property.surface_covered)} m² cub.` },
    property.rooms && { icon: <IconRooms />, value: `${property.rooms} amb.` },
    property.bedrooms && { icon: <IconBed />, value: `${property.bedrooms} dorm.` },
    property.bathrooms && { icon: <IconBath />, value: `${property.bathrooms} baños` },
    property.parking && { icon: <IconCar />, value: `${property.parking} coch.` },
    property.age && { icon: <IconAge />, value: `${property.age} años` },
  ].filter(Boolean) as { icon: React.ReactNode; value: string }[];

  // Información general (Label: valor)
  const general = [
    property.rooms && { label: "Ambientes", value: String(property.rooms) },
    property.bedrooms && { label: "Dormitorios", value: String(property.bedrooms) },
    property.bathrooms && { label: "Baños", value: String(property.bathrooms) },
    property.parking && { label: "Cocheras", value: String(property.parking) },
    property.orientation && { label: "Orientación", value: property.orientation },
    property.age && { label: "Antigüedad", value: `${property.age} años` },
    property.expenses && { label: "Expensas", value: `$ ${fm(property.expenses)}` },
  ].filter(Boolean) as { label: string; value: string }[];

  // Superficies y medidas
  const medidas = [
    property.surface_total && { label: "Total construido", value: m2(property.surface_total)! },
    property.surface_covered && { label: "Superficie cubierta", value: m2(property.surface_covered)! },
    property.surface_semicovered && { label: "Semicubierta", value: m2(property.surface_semicovered)! },
    property.surface_uncovered && { label: "Descubierta", value: m2(property.surface_uncovered)! },
    property.surface_land && { label: "Terreno", value: m2(property.surface_land)! },
    property.front_measure && { label: "Frente", value: `${fm(property.front_measure)} m` },
    property.depth_measure && { label: "Fondo", value: `${fm(property.depth_measure)} m` },
  ].filter(Boolean) as { label: string; value: string }[];

  const hasGeo = property.geo_lat != null && property.geo_long != null;
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const staticMap =
    hasGeo && mapsKey
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${property.geo_lat},${property.geo_long}&zoom=15&size=640x320&scale=2&markers=color:0x1f6feb%7C${property.geo_lat},${property.geo_long}&key=${mapsKey}`
      : null;
  const mapsLink = hasGeo
    ? `https://www.google.com/maps/search/?api=1&query=${property.geo_lat},${property.geo_long}`
    : null;

  return (
    <main className="min-h-full bg-white text-[#1b2733]">
      {/* Header slim neutro (sin branding) */}
      <header className="border-b border-[#eef1f4]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide text-[#1f6feb]">Ficha de propiedad</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        {/* Galería + multimedia */}
        <ColegaGallery photos={property.photos} alt={property.address} media={media} />

        {/* Título + precio */}
        <div className="mt-7 mb-8">
          <p className="text-xs text-[#9aa7b2] mb-1">
            {[property.reference_code, property.type].filter(Boolean).join("  |  ")}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1b2733] tracking-tight">{property.address}</h1>
          {(property.full_location || property.location) && (
            <p className="flex items-center gap-1.5 text-sm text-[#6b7280] mt-1.5">
              <IconPin />
              {property.full_location || property.location}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#1f6feb] rounded-full px-3 py-1">
              {property.operation_type}
            </span>
            <span className="text-3xl font-bold text-[#1f6feb]">{property.price}</span>
          </div>
        </div>

        {/* Atributos con icono */}
        {attrs.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mb-9">
            {attrs.map((a, i) => (
              <AttrChip key={i} icon={a.icon} value={a.value} />
            ))}
          </div>
        )}

        {/* Información general */}
        {general.length > 0 && (
          <Section title="Información general">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-2.5">
              {general.map((g, i) => (
                <p key={i} className="text-sm text-[#5b6b7a]">
                  {g.label}: <span className="text-[#2b3440] font-medium">{g.value}</span>
                </p>
              ))}
            </div>
          </Section>
        )}

        {/* Superficies y medidas */}
        {medidas.length > 0 && (
          <Section title="Superficies y medidas">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-2.5">
              {medidas.map((m, i) => (
                <p key={i} className="text-sm text-[#5b6b7a]">
                  {m.label}: <span className="text-[#2b3440] font-medium">{m.value}</span>
                </p>
              ))}
            </div>
          </Section>
        )}

        {/* Descripción */}
        {property.description && (
          <Section title="Descripción">
            <ColegaDescription text={property.description} />
          </Section>
        )}

        {/* Ambientes / Adicionales / Servicios (check verde) */}
        {(ambientes.length > 0 || adicionales.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {ambientes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[#1b2733] mb-4">Ambientes</h2>
                <CheckList items={ambientes} />
              </div>
            )}
            {adicionales.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[#1b2733] mb-4">Adicionales</h2>
                <CheckList items={adicionales} />
              </div>
            )}
          </div>
        )}
        {servicios.length > 0 && (
          <Section title="Servicios">
            <CheckList items={servicios} />
          </Section>
        )}

        {/* Ubicación */}
        {hasGeo && (
          <Section
            title="Ubicación"
            action={
              <a href={mapsLink!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1f6feb] hover:underline">
                Abrir en Google Maps <IconExternal />
              </a>
            }
          >
            {staticMap ? (
              <a href={mapsLink!} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden border border-[#eceff3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={staticMap} alt="Mapa de ubicación" className="w-full h-auto" />
              </a>
            ) : (
              <div className="rounded-2xl border border-[#eceff3] bg-[#F7F9FB] h-40 flex items-center justify-center text-sm text-[#9aa7b2]">
                Mapa no disponible
              </div>
            )}
          </Section>
        )}

        <p className="text-xs text-[#9aa7b2] text-center border-t border-[#eef1f4] pt-6 mt-2">
          Ficha informativa de la propiedad. Datos sujetos a verificación.
        </p>
      </div>
    </main>
  );
}
