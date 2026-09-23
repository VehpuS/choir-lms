import { monoFontFamily } from './mono-font-family';

/**
 * Nocturne design tokens for the mobile rehearsal player.
 *
 * Every color, radius, spacing, type, and elevation value used under
 * `src/app/**` comes from this module. Ramp steps run light (100) to dark
 * (900); each step is anchored to a value used in the 1a–1j design mockups.
 */

const neutralRamp = {
  100: '#e9e9ed',
  200: '#cfd3e5',
  300: '#b2b6ca',
  400: '#9397ab',
  500: '#75798c',
  600: '#3f424d',
  700: '#292b31',
  800: '#232532',
  900: '#161826',
} as const;

const accentRamp = {
  100: '#f5f4ff',
  200: '#d2cefd',
  300: '#b5abfc',
  400: '#a396ea',
  500: '#9184d9',
  600: '#796cbf',
  700: '#423a6a',
  800: '#2b2741',
  900: '#1d1f30',
} as const;

const TEXT_RGB = '233,233,237';
const ACCENT_RGB = '145,132,217';

const nocturneColors = {
  /** Screen background and sheet surface. */
  bg: neutralRamp[900],
  /** The dimmed page under a bottom sheet. */
  bgBehindSheet: '#101220',
  /** Cards, the active loop card, search field fill. */
  surface: neutralRamp[800],
  /** Mini-player and tab-bar band. */
  surfaceRaised: '#1b1e2c',
  /** Icon tile behind an active row glyph, tag chips, FAB. */
  surfaceAccent: accentRamp[800],
  text: neutralRamp[100],
  textSecondary: neutralRamp[200],
  textMuted: neutralRamp[400],
  textFaint: neutralRamp[500],
  icon: neutralRamp[300],
  /** Base accent: lines, rings, active chips, progress. Not for body text. */
  accent: accentRamp[500],
  /** Body-size accent text on the dark ground. */
  accentText: accentRamp[300],
  /** Text on an accent-tinted chip. */
  accentOnTint: accentRamp[200],
  accentBorderDeep: accentRamp[700],
  accentBorderSoft: `rgba(${ACCENT_RGB},0.55)`,
  accentGlow: `rgba(${ACCENT_RGB},0.28)`,
  accentRegionFill: `rgba(${ACCENT_RGB},0.1)`,
  accentRegionEdge: `rgba(${ACCENT_RGB},0.42)`,
  divider: neutralRamp[600],
  hairline: `rgba(${TEXT_RGB},0.07)`,
  borderSubtle: `rgba(${TEXT_RGB},0.1)`,
  borderTile: `rgba(${TEXT_RGB},0.12)`,
  borderChip: `rgba(${TEXT_RGB},0.14)`,
  borderButton: `rgba(${TEXT_RGB},0.16)`,
  highlightFill: accentRamp[700],
  highlightText: accentRamp[100],
  /** Fully transparent, for rules that fade at their ends. */
  transparent: 'transparent',
  shadow: '#000000',
  neutral: neutralRamp,
  accentRamp,
} as const;

/**
 * Pre-Nocturne key names, kept so existing call sites migrate by inheritance.
 * Prefer the Nocturne names above in new and touched code.
 */
const legacyColorAliases = {
  border: nocturneColors.borderChip,
  cardBackground: nocturneColors.surface,
  heroBackground: nocturneColors.surfaceRaised,
  listMarker: nocturneColors.accent,
  pageBackground: nocturneColors.bg,
  primaryText: nocturneColors.text,
  secondaryText: nocturneColors.textMuted,
  surfaceBackground: nocturneColors.surface,
} as const;

const radius = {
  sm: 4,
  nudge: 6,
  md: 8,
  lg: 14,
  sheet: 22,
  pill: 999,
} as const;

/** Nocturne's compact spacing: a 4pt base scale multiplied by 0.70, rounded. */
const SPACE_SCALE_FACTOR = 0.7;
const BASE_SPACE_STEPS = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;
const [xxs, xs, sm, md, lg, xl, xxl, xxxl, huge, giant] = BASE_SPACE_STEPS.map(
  (step) => {
    return Math.round(step * SPACE_SCALE_FACTOR);
  },
);

const space = {
  xxs,
  xs,
  sm,
  md,
  lg,
  xl,
  xxl,
  xxxl,
  huge,
  giant,
  /** Horizontal padding for destination screens. */
  screenInset: 20,
  /** Horizontal padding for bottom sheets. */
  sheetInset: 22,
  /** Minimum hit area for any interactive control. */
  touchTarget: 44,
} as const;

/** Elevation is a hairline edge plus restrained ambient darkness. */
const elevation = {
  flat: {
    borderColor: nocturneColors.borderSubtle,
    borderWidth: 1,
  },
  raised: {
    borderColor: nocturneColors.divider,
    borderWidth: 1,
    elevation: 4,
    shadowColor: nocturneColors.shadow,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  sheet: {
    borderColor: nocturneColors.divider,
    borderWidth: 1,
    elevation: 8,
    shadowColor: nocturneColors.shadow,
    shadowOffset: { height: -18, width: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 44,
  },
} as const;

const fontWeight = {
  regular: '400',
  medium: '500',
} as const;

const fontFamily = {
  mono: monoFontFamily,
} as const;

/** Fixed-width numerals for durations, ranges, multipliers, and semitones. */
const tabularNumbers = ['tabular-nums'] as const;

const type = {
  destinationTitle: {
    fontSize: 28,
    fontWeight: fontWeight.medium,
    letterSpacing: -0.56,
    lineHeight: 31,
  },
  nowPlayingTitle: {
    fontSize: 32,
    fontWeight: fontWeight.medium,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  sheetTitle: {
    fontSize: 21,
    fontWeight: fontWeight.medium,
    letterSpacing: -0.35,
  },
  sectionHead: { fontSize: 13, fontWeight: fontWeight.medium },
  rowTitle: { fontSize: 15, fontWeight: fontWeight.medium },
  rowMeta: {
    color: nocturneColors.textMuted,
    fontSize: 12,
    fontWeight: fontWeight.regular,
  },
  kicker: {
    fontSize: 10,
    fontWeight: fontWeight.regular,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  chip: { fontSize: 12.5 },
  button: { fontSize: 13.5, fontWeight: fontWeight.medium },
  tabLabel: { fontSize: 10, fontWeight: fontWeight.medium },
  body: { fontSize: 14, fontWeight: fontWeight.regular },
  numericReadout: {
    color: nocturneColors.accentText,
    fontFamily: fontFamily.mono,
    fontSize: 18,
  },
  timecode: {
    color: nocturneColors.textMuted,
    fontFamily: fontFamily.mono,
    fontSize: 11.5,
  },
} as const;

export const appTheme = {
  colors: { ...nocturneColors, ...legacyColorAliases },
  elevation,
  fontFamily,
  fontWeight,
  radius,
  space,
  tabularNumbers,
  type,
} as const;

export type AppTheme = typeof appTheme;
