// ─── POS Estimation — Design Tokens ─────────────────────────────────────────

export const Colors = {
  // Primary blue palette
  primary:       '#1565C0',
  primaryLight:  '#1E88E5',
  primaryDark:   '#0D47A1',
  primaryBg:     '#E3F2FD',

  // Semantic colours
  success:       '#2E7D32',
  successBg:     '#E8F5E9',
  warning:       '#F57F17',
  warningBg:     '#FFFDE7',
  error:         '#C62828',
  errorBg:       '#FFEBEE',
  info:          '#0277BD',
  infoBg:        '#E1F5FE',

  // Neutrals
  white:         '#FFFFFF',
  background:    '#F5F7FA',
  surface:       '#FFFFFF',
  border:        '#E0E6ED',
  divider:       '#ECEFF1',

  // Text
  textPrimary:   '#1A2332',
  textSecondary: '#546E7A',
  textDisabled:  '#B0BEC5',
  textInverse:   '#FFFFFF',

  // Table
  tableHeader:   '#1565C0',
  tableRowEven:  '#F5F7FA',
  tableRowOdd:   '#FFFFFF',
  tableRowHover: '#E3F2FD',
};

export const Typography = {
  fontSizeXS:   10,
  fontSizeSM:   12,
  fontSizeMD:   14,
  fontSizeLG:   16,
  fontSizeXL:   18,
  fontSizeXXL:  22,
  fontSizeH1:   28,

  fontWeightNormal:   '400' as const,
  fontWeightMedium:   '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold:     '700' as const,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius:  2,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius:  4,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius:  8,
    elevation:     8,
  },
};
