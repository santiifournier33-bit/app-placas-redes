import React from 'react';
import { AbsoluteFill, Img } from 'remotion';

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
}

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
const NAVY = '#002548';
const NAVY_DARK = '#001430';

const formatNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null) return "0";
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return "0";
  return Math.floor(val).toString();
};

// ═══════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════
const BedIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
const BathIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11h16"/><path d="M5 11v4c0 1.657 1.343 3 3 3h8c1.657 0 3-1.343 3-3v-4"/><path d="M8 18v2"/><path d="M16 18v2"/><path d="M16 11V6a3 3 0 0 0-3-3h-1"/><path d="M10 5h4"/><path d="M10 2v3"/></svg>;
const SupTotalIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><path d="M10 8h-2"/><path d="M10 12h-2"/><path d="M10 16h-2"/><path d="M16 4v16"/><path d="M13 7l3-3 3 3"/><path d="M13 17l3 3 3-3"/></svg>;
const SupCubiertaIcon = ({ size = 64 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>;

// ═══════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════
export const StoryPlacaComposition: React.FC<{
  property: PropertyData;
  format: 'story' | 'post';
}> = ({ property, format }) => {
  const isPost = format === 'post';
  const photos = property.photos || [];
  
  // Guard against missing photos (need exactly 4 or gracefully handle less)
  const mainPhoto = photos[0] || '';
  const photo2 = photos[1] || '';
  const photo3 = photos[2] || '';
  const photo4 = photos[3] || '';

  const isAlquiler = property.operation_type?.toLowerCase().includes('alquiler');
  const typeTranslated = isAlquiler ? 'EN ALQUILER' : 'EN VENTA';

  let rawType = '';
  if (typeof property.type === 'string') {
    rawType = property.type;
  } else if (property.type && typeof property.type === 'object' && 'name' in property.type) {
    rawType = (property.type as any).name;
  }
  let displayType = rawType || 'Propiedad';

  const translations: Record<string, string> = {
    'house': 'Casa',
    'apartment': 'Departamento',
    'flat': 'Departamento',
    'land': 'Terreno',
    'commercial land': 'Terreno Comercial',
    'office': 'Oficina',
    'store': 'Local',
    'garage': 'Cochera',
    'farm': 'Campo',
    'warehouse': 'Galpón',
    'industrial': 'Nave Industrial'
  };
  
  const lowerType = displayType.toLowerCase();
  displayType = translations[lowerType] || displayType;

  if (displayType.toLowerCase() === 'nave industrial') displayType = 'N. Industrial';
  if (displayType.toLowerCase() === 'terreno comercial') displayType = 'T. Comercial';
  if (displayType.toLowerCase() === 'fondo de comercio') displayType = 'F. Comercio';

  return (
    <div style={{
      width: '1080px',
      height: isPost ? '1080px' : '1920px',
      backgroundColor: '#f5f5f5', // Light gray background
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-inter), sans-serif',
    }}>
      
      {/* HEADER (Navy Background) */}
      <div style={{
        background: 'linear-gradient(135deg, #001430 0%, #003a70 100%)',
        height: isPost ? '350px' : '480px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Logo at the top of the header */}
        <Img 
          src="/logo-blanco-oficial.png" 
          style={{ height: isPost ? '180px' : '280px', objectFit: 'contain', marginBottom: isPost ? '20px' : '30px' }} 
        />
        
        {/* Separator line */}
        <div style={{
          height: '4px',
          width: '120px',
          backgroundColor: '#334A66', // subtle navy separator
          marginBottom: isPost ? '15px' : '20px',
        }}/>
        
        {/* Operation Type Text */}
        <div style={{
          color: 'white',
          fontSize: isPost ? '70px' : '72px',
          fontWeight: 700,
          letterSpacing: '0.25em',
          textTransform: 'uppercase'
        }}>
          {typeTranslated}
        </div>
      </div>

      {/* PHOTOS AREA */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: isPost ? '15px' : '40px 40px 10px 40px',
        gap: isPost ? '10px' : '20px',
        backgroundColor: '#f5f5f5'
      }}>
        {/* Main Photo with PRICE OVERLAY */}
        <div style={{
          width: '100%',
          height: isPost ? '320px' : '580px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
        }}>
          {mainPhoto && <Img src={mainPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          
          {/* Property Type Badge (Top-Left) */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(0, 20, 48, 0.85)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: isPost ? '8px 16px' : '15px 30px',
            fontSize: isPost ? '22px' : '36px',
            fontWeight: 600,
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            maxWidth: isPost ? '300px' : '450px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            {displayType}
          </div>

          {/* Price Badge inside Photo */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            padding: isPost ? '10px 20px' : '20px 40px',
            fontSize: isPost ? '28px' : '48px',
            fontWeight: 700,
            borderRadius: '4px',
          }}>
            {property.price}
          </div>
        </div>

        {/* 3 Secondary Photos Below */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          gap: isPost ? '10px' : '20px'
        }}>
          {[photo2, photo3, photo4].map((p, i) => (
            <div key={i} style={{
              width: 'calc(33.33% - 13.33px)',
              height: isPost ? '140px' : '260px',
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {p && <Img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* INFORMATION AREA (Bottom) */}
      <div style={{
        flex: 1,
        backgroundColor: '#e8e8e8', // light grayish base
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', // Always centered per user request
        padding: isPost ? '20px 40px' : '50px 60px',
        position: 'relative'
      }}>
        {/* Location Text */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: isPost ? '30px' : '50px',
          fontFamily: 'var(--font-inter)',
          lineHeight: 1.2,
          gap: '8px',
          width: '100%'
        }}>
          <span style={{ fontSize: isPost ? '38px' : '52px', fontWeight: 700, color: '#333', textAlign: 'center' }}>
            {property.address || "Propiedad Destacada"}
          </span>
          {property.location && (
            <span style={{ fontSize: isPost ? '26px' : '36px', fontWeight: 400, color: '#666', textAlign: 'center' }}>
              {property.location}
            </span>
          )}
        </div>

        {/* Horizontal Icons Row */}
        <div style={{ display: 'flex', gap: isPost ? '30px' : '45px', marginBottom: isPost ? '40px' : '60px', width: '100%', justifyContent: 'center' }}>
          
          {(property.bedrooms > 0 || property.rooms > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#333' }}>
              <BedIcon size={isPost ? 48 : 80} />
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '16px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: isPost ? '28px' : '40px', fontWeight: 700 }}>{property.bedrooms > 0 ? property.bedrooms : property.rooms}</span>
                <span style={{ fontSize: isPost ? '20px' : '26px', fontWeight: 600, marginLeft: '6px' }}>habs.</span>
              </div>
            </div>
          )}
          
          {property.bathrooms > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#333' }}>
              <BathIcon size={isPost ? 48 : 80} />
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '16px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: isPost ? '28px' : '40px', fontWeight: 700 }}>{property.bathrooms}</span>
                <span style={{ fontSize: isPost ? '20px' : '26px', fontWeight: 600, marginLeft: '6px' }}>baños</span>
              </div>
            </div>
          )}
          
          {property.surface_covered > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#333' }}>
              <SupCubiertaIcon size={isPost ? 48 : 80} />
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '16px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: isPost ? '28px' : '40px', fontWeight: 700 }}>{formatNumber(property.surface_covered)} m²</span>
                <span style={{ fontSize: isPost ? '20px' : '26px', fontWeight: 600, marginLeft: '6px' }}>(cub)</span>
              </div>
            </div>
          )}

          {property.surface_total > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#333' }}>
              <SupTotalIcon size={isPost ? 48 : 80} />
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '16px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: isPost ? '28px' : '40px', fontWeight: 700 }}>{formatNumber(property.surface_total)} m²</span>
                <span style={{ fontSize: isPost ? '20px' : '26px', fontWeight: 600, marginLeft: '6px' }}>(tot)</span>
              </div>
            </div>
          )}

        </div>

        {/* Thin Divider Line */}
        <div style={{ 
          height: '2px', 
          width: isPost ? '70%' : '50%', 
          backgroundColor: '#bbbbbb', 
          marginBottom: isPost ? '25px' : '45px' 
        }} />

        {/* CTA Text */}
        <div style={{
          fontSize: isPost ? '28px' : '44px',
          color: '#555',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px'
        }}>
          Escribinos para <span style={{ color: '#111', fontWeight: 800 }}>más información</span>
        </div>
      </div>
      
    </div>
  );
};
