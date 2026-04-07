import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  staticFile,
} from 'remotion';
import { Audio } from '@remotion/media';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
interface PropertyData {
  address?: string;
  real_address?: string;
  fake_address?: string;
  title?: string;
  publication_title?: string;
  price: string;
  type: { name: string } | string;
  operation_type: string;
  location: string;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  surface_total: number;
  surface_covered: number;
  photos: string[];
  age?: number;
  orientation?: string;
  parking?: number;
  agent?: { name?: string; phone?: string; cellphone?: string };
  producer?: { name?: string; phone?: string; email?: string; cellphone?: string };
  users?: Array<{ name?: string; phone?: string }>;
  tags?: Array<{ name: string }>;
  features?: Array<{ name: string }>;
}

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
const NAVY = '#002548';
const NAVY_DARK = '#001430';
const GOLD = '#C8A45A';
const SECONDARY = '#006689';
const RED_BADGE = '#e83838';
const SCENE_DURATION = 90; // 3 seconds at 30fps
const FADE_DURATION = 15;  // 0.5 second fade

// ═══════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════
const translateType = (typeRaw: any) => {
  if (!typeRaw) return "Propiedad";
  const str = typeof typeRaw === "string" ? typeRaw : typeRaw.name || "Propiedad";
  const dict: Record<string, string> = {
    "house": "Casa",
    "apartment": "Departamento",
    "land": "Lote",
    "lot": "Lote",
    "farm": "Quinta",
    "office": "Oficina",
    "commercial": "Local",
    "garage": "Cochera"
  };
  return dict[str.toLowerCase()] || str;
};

// Formats numbers without decimals (e.g., 613.00 => 613)
const formatNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null) return "0";
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return "0";
  return Math.floor(val).toString();
};

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) {
    // 54 9 11 1234-5678
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
  }
  return phone;
};

// ═══════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════
const BedIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
const BathIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11h16"/><path d="M5 11v4c0 1.657 1.343 3 3 3h8c1.657 0 3-1.343 3-3v-4"/><path d="M8 18v2"/><path d="M16 18v2"/><path d="M16 11V6a3 3 0 0 0-3-3h-1"/><path d="M10 5h4"/><path d="M10 2v3"/></svg>;
// Sup Total Icon (Arrows up down with horizontal bounds)
const SupTotalIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><path d="M10 8h-2"/><path d="M10 12h-2"/><path d="M10 16h-2"/><path d="M16 4v16"/><path d="M13 7l3-3 3 3"/><path d="M13 17l3 3 3-3"/></svg>;
// Sup Cubierta Icon (Square with folded/arrow top-right corner)
const SupCubiertaIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>;
const CalendarIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const CarIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>;
const PoolIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1S7 6.5 8 6c.6-.5 1.2-1 2.5-1s2.5.5 3.5 1c.6.5 1.2 1 2.5 1s2.5-.5 3.5-1c.6-.5 1.2-1 2.5-1s2.5.5 3.5 1c.6.5 1.2 1 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1S7 12.5 8 12c.6-.5 1.2-1 2.5-1s2.5.5 3.5 1c.6.5 1.2 1 2.5 1s2.5-.5 3.5-1c.6-.5 1.2-1 2.5-1s2.5.5 3.5 1c.6.5 1.2 1 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1S7 18.5 8 18c.6-.5 1.2-1 2.5-1s2.5.5 3.5 1c.6.5 1.2 1 2.5 1s2.5-.5 3.5-1c.6-.5 1.2-1 2.5-1s2.5.5 3.5 1c.6.5 1.2 1 2.5 1"/></svg>;
const ShieldIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;


// ═══════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════
const TopLogos: React.FC<{ isAlquiler: boolean }> = ({ isAlquiler }) => {
  return (
    <>
      {/* Top Left Badge */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: '60px',
        background: isAlquiler ? GOLD : RED_BADGE,
        color: 'white',
        padding: '10px 24px',
        fontSize: '24px',
        fontWeight: 'bold',
        fontFamily: 'var(--font-inter)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        {isAlquiler ? 'ALQUILER' : 'VENTA'}
      </div>
      
      {/* Top Right Logo - Doubled from previous size to be massive */}
      <div style={{
        position: 'absolute',
        top: '60px',
        right: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        borderRadius: '8px',
      }}>
        <Img src="/logo-pequeno.png" style={{ height: '240px', objectFit: 'contain' }} />
      </div>
    </>
  );
};

const KenBurnsScene: React.FC<{
  imageUrl: string;
  direction: 'in' | 'out';
  children?: React.ReactNode;
  overlayStyle?: React.CSSProperties;
}> = ({ imageUrl, direction, children, overlayStyle }) => {
  const frame = useCurrentFrame();

  const scale = direction === 'in'
    ? interpolate(frame, [0, SCENE_DURATION], [1.02, 1.15], { extrapolateRight: 'clamp' })
    : interpolate(frame, [0, SCENE_DURATION], [1.15, 1.02], { extrapolateRight: 'clamp' });

  const opacity = interpolate(frame, [0, FADE_DURATION, SCENE_DURATION - FADE_DURATION, SCENE_DURATION], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {imageUrl ? (
          <Img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${NAVY}, ${SECONDARY})` }} />
        )}
      </AbsoluteFill>
      {overlayStyle && <AbsoluteFill style={overlayStyle} />}
      {children}
    </AbsoluteFill>
  );
};

const AnimatedText: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <div
      style={{
        transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
        opacity: interpolate(progress, [0, 1], [0, 1]),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ═══════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════
export const PropertyComposition: React.FC<{
  property: PropertyData;
  audioUrl?: string;
}> = ({ property, audioUrl }) => {
  const photos = property.photos || [];
  const selectedPhotos = photos.length > 0 ? photos : [''];
  const isAlquiler = property.operation_type?.toLowerCase().includes('alquiler');
  const typeTranslated = translateType(property.type);

  // Address
  const mainAddress = property.publication_title || property.title || property.address || "Propiedad";
  
  // Agent (Agent > Producer > Center) Phone & Data calculation
  let contactName = "Freire Propiedades";
  let contactPhone = "5491151454915";
  
  const mainAgent = property.agent;
  const fallbackProducer = property.producer;

  if (mainAgent?.name) {
    contactName = mainAgent.name;
    const p = (mainAgent.cellphone || mainAgent.phone || "").replace(/\D/g, '');
    if (p) contactPhone = p;
  } else if (fallbackProducer?.name) {
    contactName = fallbackProducer.name;
    const p = (fallbackProducer.cellphone || fallbackProducer.phone || "").replace(/\D/g, '');
    if (p) contactPhone = p;
  }

  // Tags logic for extra features
  const hasPool = property.tags?.some(t => t?.name?.toLowerCase().includes('pileta') || t?.name?.toLowerCase().includes('piscina'));
  const hasSecurity = property.tags?.some(t => t?.name?.toLowerCase().includes('seguridad'));

  // Build a queue for extra features to show in sequential photos (2 items per slide)
  type FeatureDef = { icon: React.ReactNode, val: string, label: string };
  const extraFeatures: FeatureDef[] = [];

  if (property.parking && property.parking > 0) {
    extraFeatures.push({ icon: <CarIcon size={80}/>, val: property.parking.toString(), label: "Cocheras" });
  }
  const disabledAgeTypes = ['terreno', 'lote', 'chacra', 'terreno comercial', 'campo'];
  const rawTypeStr = typeof property.type === 'string' ? property.type : (property.type as any)?.name || "";
  const isLand = disabledAgeTypes.includes(typeTranslated.toLowerCase()) || 
                 disabledAgeTypes.includes(rawTypeStr.toLowerCase());

  if (property.age !== undefined && property.age >= 0 && !isLand) {
    extraFeatures.push({ icon: <CalendarIcon size={80}/>, val: property.age === 0 ? "A estrenar" : `${property.age} años`, label: "Antigüedad" });
  }
  if (hasPool) {
    extraFeatures.push({ icon: <PoolIcon size={80}/>, val: "Sí", label: "Pileta" });
  }
  if (hasSecurity) {
    extraFeatures.push({ icon: <ShieldIcon size={80}/>, val: "24hs", label: "Seguridad" });
  }

  // Helper arrays for slides >= 2
  const featureSlides: FeatureDef[][] = [];
  for (let i = 0; i < extraFeatures.length; i += 2) {
    featureSlides.push(extraFeatures.slice(i, i + 2));
  }

  // Overlays
  const bottomGradientStyle: React.CSSProperties = {
    background: 'linear-gradient(to top, rgba(0,10,30,1) 0%, rgba(0,15,35,0.6) 40%, transparent 70%)',
  };

  const getFeatureBlock = (f: FeatureDef, delay: number) => (
    <AnimatedText delay={delay} key={f.label}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', fontFamily: 'var(--font-inter)', width: 'auto', minWidth: '150px', whiteSpace: 'nowrap' }}>
        <div style={{ color: "white", marginBottom:'16px' }}>{f.icon}</div>
        <div style={{ fontSize: '64px', fontWeight: 'bold' }}>{f.val}</div>
        <div style={{ fontSize: '32px', opacity: 0.9, textTransform: 'uppercase', letterSpacing:'0.1em', marginTop: '4px' }}>{f.label}</div>
      </div>
    </AnimatedText>
  );

  // Volume Interpolation for Fade In/Out
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  
  // Fade in: 0 to 3 seconds (90 frames at 30fps)
  // Fade out: Last 4 seconds (120 frames at 30fps)
  const volume = interpolate(
    frame,
    [0, 90, durationInFrames - 120, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DARK }}>
      {audioUrl && (
        <Audio 
          src={staticFile(audioUrl)} 
          volume={volume} 
        />
      )}
      
      {/* ── SCENE 1: COVER PHOTO ── */}
      <Sequence from={0} durationInFrames={SCENE_DURATION}>
        <KenBurnsScene 
          imageUrl={selectedPhotos[0]} 
          direction="in"
          overlayStyle={bottomGradientStyle}
        >
          <TopLogos isAlquiler={isAlquiler} />
          
          <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: '0 40px 60px 40px', textAlign: 'center' }}>
            <AnimatedText delay={8}>
              <h1 style={{ 
                color: 'white', 
                fontSize: '90px', 
                margin: '0', 
                lineHeight: 1.1, 
                fontFamily: 'var(--font-playfair), serif', 
                fontWeight: 600,
                textShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {typeTranslated} en {isAlquiler ? 'Alquiler' : 'Venta'}
              </h1>
            </AnimatedText>
            
            <AnimatedText delay={12}>
              <div style={{
                width: '180px',
                height: '4px',
                backgroundColor: GOLD,
                margin: '24px 0',
                borderRadius: '2px'
              }}/>
            </AnimatedText>

            <AnimatedText delay={16}>
              <div style={{ color: 'white', fontSize: '70px', fontFamily: 'var(--font-inter)', fontWeight: 700, marginBottom: '24px' }}>
                {property.price}
              </div>
            </AnimatedText>

            <AnimatedText delay={20}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
                <div style={{ fontSize: '34px', color: 'white', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
                  {mainAddress}
                </div>
                {property.location && (
                  <div style={{ fontSize: '30px', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-inter)', fontWeight: 400 }}>
                    {property.location}
                  </div>
                )}
              </div>
            </AnimatedText>

            <AnimatedText delay={26}>
              <div style={{ display: 'flex', gap: '40px', color: 'white', fontFamily: 'var(--font-inter)', justifyContent: 'center' }}>
                {property.bedrooms > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <BedIcon size={84} />
                    <span style={{ fontSize: '52px', fontWeight: 600, marginTop: '8px' }}>{property.bedrooms}</span>
                    <span style={{ fontSize: '24px', fontWeight: 400, opacity:0.8, textTransform: 'uppercase' }}>Dorm.</span>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <BathIcon size={84} />
                    <span style={{ fontSize: '52px', fontWeight: 600, marginTop: '8px' }}>{property.bathrooms}</span>
                    <span style={{ fontSize: '24px', fontWeight: 400, opacity:0.8, textTransform: 'uppercase' }}>Baños</span>
                  </div>
                )}
                {property.surface_covered > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <SupCubiertaIcon size={84} />
                    <span style={{ fontSize: '52px', fontWeight: 600, marginTop: '8px' }}>{formatNumber(property.surface_covered)}</span>
                    <span style={{ fontSize: '24px', fontWeight: 400, opacity:0.8, textTransform: 'uppercase' }}>Cubiertos</span>
                  </div>
                )}
                {property.surface_total > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <SupTotalIcon size={84} />
                    <span style={{ fontSize: '52px', fontWeight: 600, marginTop: '8px' }}>{formatNumber(property.surface_total)}</span>
                    <span style={{ fontSize: '24px', fontWeight: 400, opacity:0.8, textTransform: 'uppercase' }}>Totales</span>
                  </div>
                )}
              </div>
            </AnimatedText>
          </AbsoluteFill>
        </KenBurnsScene>
      </Sequence>

      {/* ── SCENES 2..N: SECONDARY PHOTOS ── */}
      {selectedPhotos.slice(1).map((photo, i) => (
        <Sequence key={`sec-${i}`} from={SCENE_DURATION * (i + 1)} durationInFrames={SCENE_DURATION}>
          <KenBurnsScene 
            imageUrl={photo} 
            direction={i % 2 === 0 ? 'out' : 'in'}
            overlayStyle={bottomGradientStyle}
          >
            <TopLogos isAlquiler={isAlquiler} />
            
            <AbsoluteFill style={{ justifyContent: 'flex-end', paddingBottom: '90px' }}>
               <div style={{ display: 'flex', justifyContent: 'center', gap: '80px' }}>
                 
                 {i === 0 && (
                   // SECONDARY PHOTO 1: EXCEPCIÓN. Repite Cubiertos y Totales, formato texto Abajo
                   <>
                    {property.surface_covered > 0 && (
                      <AnimatedText delay={10}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', fontFamily: 'var(--font-inter)', width: 'auto', whiteSpace: 'nowrap', minWidth: '150px' }}>
                          <div style={{ color: "white", marginBottom:'16px' }}><SupCubiertaIcon size={80}/></div>
                          <div style={{ fontSize: '64px', fontWeight: 'bold' }}>{formatNumber(property.surface_covered)}m²</div>
                          <div style={{ fontSize: '32px', opacity: 0.9, textTransform: 'uppercase', letterSpacing:'0.1em', marginTop:'4px' }}>Cubiertos</div>
                        </div>
                      </AnimatedText>
                    )}
                    {(property.surface_total > 0 && property.surface_total >= property.surface_covered) && (
                      <AnimatedText delay={15}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', fontFamily: 'var(--font-inter)', width: 'auto', whiteSpace: 'nowrap', minWidth: '150px' }}>
                          <div style={{ color: "white", marginBottom:'16px' }}><SupTotalIcon size={80}/></div>
                          <div style={{ fontSize: '64px', fontWeight: 'bold' }}>{formatNumber(property.surface_total)}m²</div>
                          <div style={{ fontSize: '32px', opacity: 0.9, textTransform: 'uppercase', letterSpacing:'0.1em', marginTop:'4px' }}>Totales</div>
                        </div>
                      </AnimatedText>
                    )}
                   </>
                 )}

                 {i >= 1 && (
                   // SECONDARY PHOTOS 2+: Other variables staggered, using featureSlides queue
                   <>
                      {featureSlides[i - 1]?.map((feature, idx) => getFeatureBlock(feature, 10 + (idx * 5)))}
                   </>
                 )}

               </div>
            </AbsoluteFill>
          </KenBurnsScene>
        </Sequence>
      ))}

      {/* ── FINAL SCENE: OUTRO PANTALLA AZUL ── */}
      <Sequence key="outro" from={SCENE_DURATION * selectedPhotos.length} durationInFrames={SCENE_DURATION}>
        <AbsoluteFill style={{ background: `linear-gradient(to top, ${NAVY_DARK}, #1D578B)` }}>
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatedText delay={5}>
              <Img src="/logo-blanco-oficial.png" style={{ height: '350px', objectFit: 'contain', marginBottom: '80px' }} />
            </AnimatedText>
            
            <AnimatedText delay={12}>
              <div style={{
                fontSize: '56px',
                color: 'white',
                fontFamily: 'var(--font-inter)',
                fontWeight: 700,
                marginBottom: '16px',
              }}>
                {contactName}
              </div>
            </AnimatedText>

            {contactPhone && (
              <AnimatedText delay={16}>
                <div style={{
                  fontSize: '48px',
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 400,
                  marginBottom: '60px'
                }}>
                  {formatPhoneNumber(contactPhone)}
                </div>
              </AnimatedText>
            )}

            <AnimatedText delay={25}>
              <div style={{
                padding: '24px 64px',
                backgroundColor: GOLD,
                borderRadius: '40px',
                fontSize: '36px',
                fontWeight: 600,
                color: NAVY,
                fontFamily: 'var(--font-inter)',
                letterSpacing: '0.05em'
              }}>
                CONTACTAME
              </div>
            </AnimatedText>
          </div>
        </AbsoluteFill>
      </Sequence>
      
    </AbsoluteFill>
  );
};
