import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { COLORS } from './PdfStyles';

const customStyles = StyleSheet.create({
  page: { padding: '20px 30px', backgroundColor: '#FFFFFF', fontFamily: 'Inter' },
  colLeft: { width: '40%', paddingRight: '15px', height: '100%', flexDirection: 'column' },
  colRight: { width: '60%', flexDirection: 'column', height: '100%' },
  titleBadge: { fontSize: 8, color: '#888888', textTransform: 'uppercase', marginBottom: 2 },
  titleText: { fontSize: 24, fontWeight: 700, color: '#111111', marginBottom: 2, lineHeight: 1.1, letterSpacing: -0.5 },
  locationText: { fontSize: 8, color: '#555555', marginBottom: 15 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: '#1D578B', textTransform: 'uppercase', marginBottom: 4, borderBottom: `1px solid ${COLORS.grayMedium}`, paddingBottom: 6, marginTop: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5 },
  itemThird: { width: '33.3%', marginBottom: 3 },
  itemHalf: { width: '50%', marginBottom: 3 },
  label: { fontSize: 7, color: '#555555' },
  value: { fontSize: 7, fontWeight: 700, color: '#111111' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
  tagItem: { width: '33.3%', marginBottom: 2, paddingRight: 4 },
  tagText: { fontSize: 7, color: '#333333', fontWeight: 600 },
  descText: { fontSize: 7, color: '#333333', lineHeight: 1.4, textAlign: 'justify', flex: 1, paddingBottom: 6 },
  footerNote: { fontSize: 6, color: '#777777', borderTop: `1px solid #EEEEEE`, paddingTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badgeVenta: { backgroundColor: '#1D578B', color: '#FFFFFF', padding: '4px 8px', fontSize: 10, fontWeight: 700 },
  priceText: { border: '1px solid #CCCCCC', padding: '3px 8px', fontSize: 10, color: '#111111', fontWeight: 600 },
  photosCluster: { flex: 1, flexDirection: 'column', width: '100%' },
  clusterTop: { flexDirection: 'row', height: '50%', marginBottom: 2 },
  clusterBottom: { flexDirection: 'row', flexWrap: 'wrap', height: '50%' },
  agentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  agentInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentRole: { backgroundColor: '#1D578B', color: '#FFFFFF', padding: '3px 6px', fontSize: 7, fontWeight: 700, textTransform: 'uppercase', alignSelf: 'flex-end', marginBottom: 1 },
  agentNameText: { fontSize: 8, fontWeight: 700, color: '#111111' },
  agentEmailText: { fontSize: 7, color: '#333333' },
  agentPhoneText: { fontSize: 7, color: '#444444', fontWeight: 600 },
  logo: { width: 45, objectFit: 'contain' }
});

export const PdfHorizontal = ({ property }: { property: any }) => {
  const coverPhoto = property.photos && property.photos.length > 0 ? property.photos[0] : null;
  const catalogPhotos = property.photos ? property.photos.slice(1, 7) : [];
  
  const targetAgent = property.producer || property.agent || property.broker || {};
  const agentName = targetAgent.name || (targetAgent.first_name ? `${targetAgent.first_name} ${targetAgent.last_name || ''}`.trim() : "Natalia Correa");
  const agentEmail = targetAgent.email || "";
  const agentPhone = targetAgent.cellphone || targetAgent.phone || "";
  
  const mapUrl = property.geo_lat && property.geo_long 
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${property.geo_lat},${property.geo_long}&zoom=15&size=400x300&markers=color:red%7C${property.geo_lat},${property.geo_long}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}`
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

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={customStyles.page}>
        <View style={{ flexDirection: 'row', height: '100%' }}>
          
          {/* LEFT COLUMN */}
          <View style={customStyles.colLeft}>
            <Text style={customStyles.titleBadge}>{property.reference_code || `FHO${property.id}`} | {property.type}</Text>
            <Text style={customStyles.titleText}>{property.address}</Text>
            <Text style={customStyles.locationText}>{property.full_location || property.location}</Text>

            <Text style={[customStyles.sectionTitle, { marginTop: 0 }]}>INFORMACIÓN GENERAL</Text>
            <View style={customStyles.row}>
              {property.rooms > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Ambientes: <Text style={customStyles.value}>{property.rooms}</Text></Text></View>}
              {property.bedrooms > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Dormitorios: <Text style={customStyles.value}>{property.bedrooms}</Text></Text></View>}
              {property.bathrooms > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Baños: <Text style={customStyles.value}>{property.bathrooms}</Text></Text></View>}
              {property.age > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Antigüedad: <Text style={customStyles.value}>{property.age} Años</Text></Text></View>}
              {property.parking > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Cocheras: <Text style={customStyles.value}>{property.parking}</Text></Text></View>}
            </View>

            <Text style={customStyles.sectionTitle}>SUPERFICIES Y MEDIDAS</Text>
            <View style={customStyles.row}>
              {property.surface_total > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Sum Total: <Text style={customStyles.value}>{property.surface_total} m²</Text></Text></View>}
              {property.surface_covered > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Cubierta: <Text style={customStyles.value}>{property.surface_covered} m²</Text></Text></View>}
              {property.surface_semicovered > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Semicub.: <Text style={customStyles.value}>{property.surface_semicovered} m²</Text></Text></View>}
              {property.surface_uncovered > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Descub.: <Text style={customStyles.value}>{property.surface_uncovered} m²</Text></Text></View>}
              {property.surface_land > 0 && <View style={customStyles.itemThird}><Text style={customStyles.label}>Terreno: <Text style={customStyles.value}>{property.surface_land} m²</Text></Text></View>}
            </View>

            {servicios.length > 0 && (
              <>
                <Text style={customStyles.sectionTitle}>SERVICIOS</Text>
                {renderTagsGrid(servicios)}
              </>
            )}

            {ambientes.length > 0 && (
              <>
                <Text style={customStyles.sectionTitle}>AMBIENTES</Text>
                {renderTagsGrid(ambientes)}
              </>
            )}

            {adicionales.length > 0 && (
              <>
                <Text style={customStyles.sectionTitle}>ADICIONALES</Text>
                {renderTagsGrid(adicionales)}
              </>
            )}
            
            <Text style={customStyles.sectionTitle}>DESCRIPCIÓN</Text>
            {/* Limit max characters strictly if we ever overflow, but let it grow to fill the column otherwise */}
            <Text style={customStyles.descText}>
              {(property.description || "Sin descripción disponible.").substring(0, 1800)}
              {property.description && property.description.length > 1800 ? "..." : ""}
            </Text>

            <Text style={customStyles.footerNote}>
              Las medidas son aproximadas y orientativas. Propiedad comercializada por Freire Propiedades.
            </Text>
          </View>

          {/* RIGHT COLUMN */}
          <View style={customStyles.colRight}>
            <View style={customStyles.priceRow}>
              <Text style={customStyles.badgeVenta}>{property.operation_type}</Text>
              <Text style={customStyles.priceText}>{property.price}</Text>
            </View>

            <View style={customStyles.photosCluster}>
              <View style={customStyles.clusterTop}>
                {coverPhoto && <Image src={coverPhoto} style={{ width: '66.6%', height: '100%', objectFit: 'cover', paddingRight: 2 }} />}
                {mapUrl ? (
                  <Image src={mapUrl} style={{ width: '33.4%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <View style={{ width: '33.4%', height: '100%', backgroundColor: '#E0E0E0' }}></View>
                )}
              </View>
              <View style={customStyles.clusterBottom}>
                {catalogPhotos.map((p: string, i: number) => (
                  <Image key={i} src={p} style={{ width: '33.33%', height: '50%', objectFit: 'cover', padding: 1 }} />
                ))}
              </View>
            </View>

            <View style={customStyles.agentRow}>
              <View style={customStyles.agentInfo}>
                <View style={{ flexDirection: 'column', justifyContent: 'center' }}>
                  <Text style={customStyles.agentNameText}>{agentName}</Text>
                  {agentPhone && <Text style={customStyles.agentPhoneText}>{formatPhoneNumber(agentPhone)}</Text>}
                  {agentEmail && <Text style={customStyles.agentEmailText}>{agentEmail}</Text>}
                </View>
                <Text style={customStyles.agentRole}>AGENTE A CARGO</Text>
              </View>
              <Image src="/logo-pequeno.png" style={customStyles.logo} />
            </View>
          </View>

        </View>
      </Page>
    </Document>
  );
};
