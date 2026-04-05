import { StyleSheet, Font } from '@react-pdf/renderer';

// Register Inter font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf', fontWeight: 700 }
  ]
});

export const COLORS = {
  navy: '#003366', // Adjusted slightly to match the image blue
  navyLight: '#004080',
  redAccent: '#DB4437', // VENTA badge and Agente a Cargo badge color
  white: '#FFFFFF',
  gold: '#C8A45A',
  grayLight: '#FFFFFF', // Removed the gray bg, it is pure white in photos
  grayMedium: '#E0E0E0',
  grayDark: '#4A4A4A',
  textSecondary: '#333333'
};

export const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    fontFamily: 'Inter',
    padding: '30px', 
    margin: 0
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: '15px',
    borderBottom: `1px solid ${COLORS.grayMedium}`,
    alignItems: 'center'
  },
  logo: {
    width: 90,
    height: 90,
    objectFit: 'contain'
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  agentInfo: {
    alignItems: 'flex-end'
  },
  agentRole: {
    backgroundColor: COLORS.redAccent,
    color: COLORS.white,
    padding: '3px 8px',
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 5,
    borderRadius: 2
  },
  agentName: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2
  },
  agentPhone: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 400
  },
  agentPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    objectFit: 'cover'
  },
  propertyTitleBox: {
    paddingTop: '20px',
    paddingBottom: '10px',
    backgroundColor: COLORS.white
  },
  propertyType: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5
  },
  propertyTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111111',
    marginBottom: 5
  },
  propertyLocation: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 10
  },
  priceBadge: {
    backgroundColor: COLORS.redAccent,
    color: COLORS.white,
    padding: '5px 10px',
    borderRadius: 3,
    fontSize: 12,
    fontWeight: 700,
    alignSelf: 'flex-start'
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  priceBadgeValue: {
    border: '1px solid #CCCCCC',
    padding: '5px 10px',
    fontSize: 12,
    color: '#111111',
    fontWeight: 600
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: '20px',
    paddingBottom: '20px',
    backgroundColor: COLORS.white
  },
  featureItem: {
    width: '30%',
    marginBottom: 6,
    flexDirection: 'row',
    gap: 4
  },
  featureLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: 600
  },
  featureValue: {
    fontSize: 9,
    fontWeight: 700,
    color: '#000000'
  },
  descriptionBox: {
    paddingTop: '20px',
    borderTop: `1px solid ${COLORS.grayMedium}`,
    backgroundColor: COLORS.white,
    marginTop: 10
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.redAccent,
    textTransform: 'uppercase',
    marginBottom: 10,
    borderBottom: `2px solid ${COLORS.grayMedium}`,
    paddingBottom: '5px'
  },
  descriptionText: {
    fontSize: 9,
    color: '#111111',
    lineHeight: 1.5,
    marginBottom: 10
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: '15px',
    justifyContent: 'space-between'
  },
  photoColumn: {
    width: '48%',
    marginBottom: '15px'
  },
  photo: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    borderRadius: 4
  },
  photoHorizontal: {
    width: '100%',
    height: 250,
    objectFit: 'cover',
    borderRadius: 4
  },
  mapBox: {
    padding: '20px 30px',
    marginTop: 20,
    backgroundColor: COLORS.white
  },
  mapImage: {
    width: '100%',
    height: 300,
    objectFit: 'cover',
    borderRadius: 6,
    marginTop: 10
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.navy,
    padding: '15px 30px',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  footerText: {
    color: COLORS.white,
    fontSize: 10
  }
});
