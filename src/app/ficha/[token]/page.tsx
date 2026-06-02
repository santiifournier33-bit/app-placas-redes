import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { verifyColegaToken } from '@/lib/colega/token';
import { fetchAndParseTokkoProperty } from '@/lib/tokko/property';
import { normalizeMedia } from '@/lib/colega/media';
import { ColegaFicha, type ColegaProperty } from '@/components/colega/ColegaFicha';

// Ruta pública (fuera del grupo (app) → sin auth). Ficha "modo colegas": muestra el
// inmueble SIN datos del asesor/inmobiliaria/branding. noindex para no indexarla.
export const metadata: Metadata = {
  title: 'Ficha de propiedad',
  robots: { index: false, follow: false },
};

export default async function FichaColegaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokkoId = verifyColegaToken(token);
  if (tokkoId === null) notFound();

  let full;
  try {
    full = await fetchAndParseTokkoProperty(tokkoId);
  } catch {
    notFound();
  }

  // Depuración explícita: sólo se pasan al cliente los campos del inmueble.
  // producer / branch / broker / agent NUNCA se incluyen.
  const property: ColegaProperty = {
    type: full.type,
    operation_type: full.operation_type,
    price: full.price,
    reference_code: full.reference_code,
    address: full.address,
    location: full.location,
    full_location: full.full_location,
    description: full.description,
    surface_total: full.surface_total,
    surface_covered: full.surface_covered,
    surface_uncovered: full.surface_uncovered,
    surface_semicovered: full.surface_semicovered,
    surface_land: full.surface_land,
    front_measure: full.front_measure,
    depth_measure: full.depth_measure,
    rooms: full.rooms,
    bathrooms: full.bathrooms,
    bedrooms: full.bedrooms,
    parking: full.parking,
    orientation: full.orientation,
    age: full.age,
    expenses: full.expenses,
    geo_lat: full.geo_lat,
    geo_long: full.geo_long,
    photos: full.photos,
    tags: full.tags as { name: string; type: number }[],
  };

  const media = normalizeMedia(full.videos);

  return <ColegaFicha property={property} media={media} />;
}
