// Normaliza el contenido multimedia de una propiedad Tokko (videos + tours 360°) a una
// lista uniforme y segura para embeber. Tolera las formas posibles de `data.videos`:
//   - { normal: string[], "360": string[] }   (forma de ficha.info)
//   - string[]                                 (lista de URLs)
//   - Array<{ video_url|player_url|url, provider?, type?, title? }>
// Sólo proveedores conocidos se embeben en iframe; el resto queda como link externo.

export type MediaKind = 'youtube' | 'vimeo' | 'kuula' | 'matterport' | 'link';

export interface MediaItem {
  kind: MediaKind;
  /** URL lista para iframe (embed seguro). Vacío si kind === 'link'. */
  embedUrl: string;
  /** URL pública original (fallback / link externo). */
  href: string;
  title: string;
  is360: boolean;
}

export interface NormalizedMedia {
  videos: MediaItem[];
  tours: MediaItem[];
}

const YT_ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;
const MATTERPORT_ID = /matterport\.com\/show\/?\?m=([\w-]+)/;

/** Detecta proveedor y arma una URL de embed segura. Si no se reconoce → kind 'link'. */
export function detectProvider(rawUrl: string, hint360 = false): MediaItem | null {
  const url = (rawUrl || '').trim();
  if (!url) return null;

  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }

  // YouTube
  const yt = url.match(YT_ID);
  if (yt || host.includes('youtube') || host.includes('youtu.be')) {
    const id = yt?.[1];
    return {
      kind: 'youtube',
      embedUrl: id ? `https://www.youtube-nocookie.com/embed/${id}` : '',
      href: url,
      title: 'Video',
      is360: hint360,
    };
  }

  // Vimeo
  const vm = url.match(VIMEO_ID);
  if (vm || host.includes('vimeo')) {
    const id = vm?.[1];
    return {
      kind: 'vimeo',
      embedUrl: id ? `https://player.vimeo.com/video/${id}` : (host.includes('player.vimeo') ? url : ''),
      href: url,
      title: 'Video',
      is360: hint360,
    };
  }

  // Kuula (360)
  if (host.includes('kuula.co')) {
    return { kind: 'kuula', embedUrl: url, href: url, title: 'Tour 360°', is360: true };
  }

  // Matterport (360)
  if (host.includes('matterport.com')) {
    const mp = url.match(MATTERPORT_ID);
    const embed = mp ? `https://my.matterport.com/show/?m=${mp[1]}` : url;
    return { kind: 'matterport', embedUrl: embed, href: url, title: 'Recorrido virtual', is360: true };
  }

  // Proveedor no allowlisteado → link externo (sin iframe, por seguridad)
  return { kind: 'link', embedUrl: '', href: url, title: hint360 ? 'Tour 360°' : 'Contenido multimedia', is360: hint360 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUrl(entry: any): string | null {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object') {
    return entry.video_url || entry.player_url || entry.url || entry.embed_url || entry.src || null;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function looks360(entry: any): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const p = String(entry.provider || entry.type || '').toLowerCase();
  return p.includes('360') || p.includes('kuula') || p.includes('matterport') || p.includes('tour');
}

/** Normaliza `data.videos` (cualquier forma soportada) a { videos, tours }. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeMedia(rawVideos: any): NormalizedMedia {
  const videos: MediaItem[] = [];
  const tours: MediaItem[] = [];
  const seen = new Set<string>();

  const push = (item: MediaItem | null) => {
    if (!item) return;
    const key = item.href;
    if (seen.has(key)) return;
    seen.add(key);
    (item.is360 ? tours : videos).push(item);
  };

  if (!rawVideos) return { videos, tours };

  // Forma { normal: [], "360": [] }
  if (!Array.isArray(rawVideos) && typeof rawVideos === 'object') {
    const normal: unknown[] = rawVideos.normal || [];
    const t360: unknown[] = rawVideos['360'] || rawVideos.tours || [];
    for (const u of t360) push(detectProvider(extractUrl(u) || '', true));
    for (const u of normal) push(detectProvider(extractUrl(u) || '', false));
    return { videos, tours };
  }

  // Forma array (strings u objetos)
  if (Array.isArray(rawVideos)) {
    for (const entry of rawVideos) {
      const u = extractUrl(entry);
      if (!u) continue;
      push(detectProvider(u, looks360(entry)));
    }
  }

  return { videos, tours };
}
