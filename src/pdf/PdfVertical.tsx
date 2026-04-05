import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { COLORS } from './PdfStyles';

const customStyles = StyleSheet.create({
  // Padding explicitly reserved: Top for header (160px) + Bottom for footer (60px)
  page: { paddingTop: 160, paddingBottom: 60, paddingLeft: 40, paddingRight: 40, backgroundColor: '#FFFFFF', fontFamily: 'Inter' },
  
  // Fixed absolute header and footer to prevent them from interfering with the natural document flow
  headerFixed: { position: 'absolute', top: 40, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20, borderBottom: `1px solid ${COLORS.grayMedium}` },
  footerFixed: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: `1px solid #EEEEEE`, paddingTop: 10 },
  
  logo: { width: 70, height: 70, objectFit: 'contain' },
  agentBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentRole: { backgroundColor: '#1D578B', color: '#FFFFFF', padding: '3px 8px', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2, alignSelf: 'flex-end' },
  agentInfoCol: { alignItems: 'flex-end', justifyContent: 'center' },
  agentNameText: { fontSize: 10, fontWeight: 700, color: '#111111' },
  agentEmailText: { fontSize: 9, color: '#333333', marginTop: 2 },
  agentPhoneText: { fontSize: 9, color: '#444444', fontWeight: 600, marginTop: 1 },
  agentPhoto: { width: 45, height: 45, borderRadius: 25, objectFit: 'cover' },
  
  titleSection: { marginBottom: 15 },
  titleBadge: { fontSize: 9, color: '#888888', textTransform: 'uppercase', marginBottom: 4 },
  titleText: { fontSize: 26, fontWeight: 700, color: '#111111', marginBottom: 4, letterSpacing: -0.5 },
  locationText: { fontSize: 10, color: '#666666', marginBottom: 15 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  badgeVenta: { backgroundColor: '#1D578B', color: '#FFFFFF', padding: '5px 12px', fontSize: 12, fontWeight: 700 },
  priceText: { border: '1px solid #CCCCCC', padding: '4px 12px', fontSize: 12, color: '#111111', fontWeight: 600 },
  
  coverPhoto: { width: '100%', height: 350, objectFit: 'cover', marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1D578B', textTransform: 'uppercase', marginBottom: 15, borderBottom: `1px solid ${COLORS.grayMedium}`, paddingBottom: 8, marginTop: 25 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5 },
  itemThird: { width: '33.3%', marginBottom: 6 },
  label: { fontSize: 9, color: '#555555' },
  value: { fontSize: 9, fontWeight: 700, color: '#111111' },
  
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  tagItem: { width: '33.3%', marginBottom: 6, paddingRight: 4 },
  tagText: { fontSize: 9, color: '#333333', fontWeight: 600 },
  descText: { fontSize: 9, color: '#333333', lineHeight: 1.6, marginBottom: 10, textAlign: 'justify' },
  
  footerNote: { fontSize: 8, color: '#777777', lineHeight: 1.4 },
  
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: '5px' },
  photoColumn: { width: '49%', height: 200, marginBottom: 10, objectFit: 'cover' },
  mapImage: { width: '100%', height: 300, objectFit: 'cover', marginTop: 10, marginBottom: 20 }
});

export const PdfVertical = ({ property }: { property: any }) => {
  const coverPhoto = property.photos && property.photos.length > 0 ? property.photos[0] : null;
  const catalogPhotos = property.photos ? property.photos.slice(1, 21) : [];
  
  const targetAgent = property.producer || property.agent || property.broker || {};
  const agentName = targetAgent.name || (targetAgent.first_name ? `${targetAgent.first_name} ${targetAgent.last_name || ''}`.trim() : "Natalia Correa");
  const agentEmail = targetAgent.email || "";
  const agentPhone = targetAgent.cellphone || targetAgent.phone || "";
  const agentPhoto = targetAgent.picture || targetAgent.profile_picture || targetAgent.photo_url || null;

  const mapUrl = property.geo_lat && property.geo_long 
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${property.geo_lat},${property.geo_long}&zoom=15&size=800x400&markers=color:red%7C${property.geo_lat},${property.geo_long}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}`
    : null;

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  // Dictionary for translating specific tags if they come in English
  const translateTag = (str: string) => {
    const dict: Record<string, string> = {
      'Water': 'Agua', 'Sewage': 'Cloaca', 'Natural Gas': 'Gas Natural', 'Electricity': 'Electricidad', 'Pavement': 'Pavimento',
      'Cable': 'Cable', 'Internet': 'Internet', 'Kitchen': 'Cocina', 'Diary dining': 'Comedor diario', 'Dependency': 'Dependencia',
      'Gallery': 'Galería', 'Individual Air conditioner': 'Aire Acondicionado individual', 'Sport center': 'Centro de deportes',
      'Barbecue': 'Parrilla', 'Land perimeter': 'Perimetral', 'Radiator heating': 'Calefacción por radiadores', '24 Hour Security': 'Seguridad 24hs'
    };
    return dict[str] || str;
  };

  const getTagsByType = (type: number) => property.tags?.filter((t: any) => t.type === type).map((t: any) => translateTag(t.name)) || [];
  const servicios = getTagsByType(1);
  const ambientes = getTagsByType(2);
  const adicionales = getTagsByType(3);

  const renderTagsGrid = (tags: string[]) => (
    <View style={customStyles.tagGrid}>
      {tags.map((t, i) => (
        <View key={i} style={customStyles.tagItem}>
          <Text style={customStyles.tagText}>{t}</Text>
        </View>
      ))}
    </View>
  );

  const renderHeader = () => (
    <View style={customStyles.headerFixed} fixed>
      <Image src="/logo-pequeno.png" style={customStyles.logo} />
      <View style={customStyles.agentBox}>
        <View style={customStyles.agentInfoCol}>
          <Text style={customStyles.agentNameText}>{agentName}</Text>
          {agentPhone && <Text style={customStyles.agentPhoneText}>{formatPhoneNumber(agentPhone)}</Text>}
          {agentEmail && <Text style={customStyles.agentEmailText}>{agentEmail}</Text>}
          <Text style={customStyles.agentRole}>AGENTE A CARGO</Text>
        </View>
        {agentPhoto && <Image src={agentPhoto} style={customStyles.agentPhoto} />}
      </View>
    </View>
  );
  
  const renderFooter = () => (
    <View style={customStyles.footerFixed} fixed>
      <Text style={customStyles.footerNote}>
        Las medidas son aproximadas y orientativas.{"\n"}
        Propiedad comercializada por Freire Propiedades.
      </Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={customStyles.page} wrap>
        
        {/* Fixed absolutely positioned Header and Footer will repeat flawlessly without disrupting flow */}
        {renderHeader()}
        {renderFooter()}

        {/* Content flows natively from start to finish. Page breaks are automatic and margins are safe! */}
        <View style={customStyles.titleSection}>
          <Text style={customStyles.titleBadge}>{property.reference_code || `FHO${property.id}`} | {property.type}</Text>
          <Text style={customStyles.titleText}>{property.address}</Text>
          <Text style={customStyles.locationText}>{property.full_location || property.location}</Text>
        </View>

        <View style={customStyles.priceRow}>
          <Text style={customStyles.badgeVenta}>{property.operation_type || "Venta"}</Text>
          <Text style={customStyles.priceText}>{property.price || "Consultar"}</Text>
        </View>

        {coverPhoto && <Image src={coverPhoto} style={customStyles.coverPhoto} />}

        <View>
          <Text style={[customStyles.sectionTitle, { marginTop: 0 }]}>INFORMACIÓN GENERAL</Text>
          <View style={customStyles.row}>
            {property.rooms > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Ambientes: <Text style={customStyles.value}>{property.rooms}</Text></Text></View>}
            {property.bedrooms > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Dormitorios: <Text style={customStyles.value}>{property.bedrooms}</Text></Text></View>}
            {property.bathrooms > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Baños: <Text style={customStyles.value}>{property.bathrooms}</Text></Text></View>}
            {property.age > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Antigüedad: <Text style={customStyles.value}>{property.age} Años</Text></Text></View>}
            {property.parking > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Cocheras: <Text style={customStyles.value}>{property.parking}</Text></Text></View>}
          </View>
        </View>

        <View>
          <Text style={customStyles.sectionTitle}>SUPERFICIES Y MEDIDAS</Text>
          <View style={customStyles.row}>
            {property.surface_total > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Superficie Total: <Text style={customStyles.value}>{property.surface_total} m²</Text></Text></View>}
            {property.surface_covered > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Superficie Cubierta: <Text style={customStyles.value}>{property.surface_covered} m²</Text></Text></View>}
            {property.surface_semicovered > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Sup. Semicubierta: <Text style={customStyles.value}>{property.surface_semicovered} m²</Text></Text></View>}
            {property.surface_uncovered > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Sup. Descubierta: <Text style={customStyles.value}>{property.surface_uncovered} m²</Text></Text></View>}
            {property.surface_land > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Terreno: <Text style={customStyles.value}>{property.surface_land} m²</Text></Text></View>}
          </View>
        </View>
        
        {servicios.length > 0 && (
          <View>
            <Text style={customStyles.sectionTitle}>SERVICIOS</Text>
            {renderTagsGrid(servicios)}
          </View>
        )}

        {ambientes.length > 0 && (
          <View>
            <Text style={customStyles.sectionTitle}>AMBIENTES</Text>
            {renderTagsGrid(ambientes)}
          </View>
        )}

        {adicionales.length > 0 && (
          <View>
            <Text style={customStyles.sectionTitle}>ADICIONALES</Text>
            {renderTagsGrid(adicionales)}
          </View>
        )}

        <View>
          <Text style={customStyles.sectionTitle}>DESCRIPCIÓN</Text>
          <Text style={customStyles.descText}>
            {property.description || "Sin descripción disponible."}
          </Text>
        </View>
        
        {catalogPhotos.length > 0 && (
          <View>
            <Text style={customStyles.sectionTitle}>FOTOS</Text>
            <View style={customStyles.photosGrid}>
              {catalogPhotos.map((p: string, i: number) => (
                <Image key={i} src={p} style={customStyles.photoColumn} />
              ))}
            </View>
          </View>
        )}
        
        {mapUrl && (
          <View wrap={false}>
            <Text style={customStyles.sectionTitle}>UBICACIÓN</Text>
            <Image src={mapUrl} style={customStyles.mapImage} />
          </View>
        )}
        
      </Page>
    </Document>
  );
};
