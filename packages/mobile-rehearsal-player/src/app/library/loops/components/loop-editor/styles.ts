import { StyleSheet } from 'react-native';

import { appTheme } from '../../../../utils/theme';

const { colors, fontFamily, fontWeight, radius, space, type } = appTheme;

// Screen 1g: the loop editor, the one place a full-screen waveform appears.
const WAVEFORM_HEIGHT = 160;
const WAVEFORM_BAR_AREA_HEIGHT = 112;
const HANDLE_HIT_WIDTH = space.touchTarget;
const HANDLE_LINE_WIDTH = 2;
const BADGE_SIZE = 22;
const PLAYHEAD_WIDTH = 2;
const RING_SIZE = 76;
const RING_WIDTH = 1.5;
const RING_GLOW_OPACITY = 0.3;
const RING_GLOW_RADIUS = 18;
const VALUE_SIZE = 18;
const GRABBER_WIDTH = 52;
const GRABBER_HEIGHT = 4;

export const loopEditorStyles = StyleSheet.create({
  sheet: {
    maxHeight: '100%',
    paddingTop: space.sm,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.bg,
    ...appTheme.elevation.sheet,
    borderBottomWidth: 0,
  },
  grabber: {
    alignSelf: 'center',
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sheetInset,
    paddingTop: space.sm,
  },
  kicker: {
    ...type.kicker,
    color: colors.textMuted,
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    gap: space.lg,
    paddingHorizontal: space.sheetInset,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
  },
  title: {
    ...type.destinationTitle,
    color: colors.text,
  },
  waveform: {
    height: WAVEFORM_HEIGHT,
    justifyContent: 'flex-end',
  },
  barRow: {
    height: WAVEFORM_BAR_AREA_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    maxWidth: 3,
    flex: 1,
    marginHorizontal: 0.5,
    borderRadius: 2,
  },
  region: {
    position: 'absolute',
    top: BADGE_SIZE + space.xs,
    bottom: 0,
    borderWidth: 1,
    borderColor: colors.accentRegionEdge,
    borderRadius: radius.md,
    backgroundColor: colors.accentRegionFill,
  },
  // A handle is a 44pt-wide touch strip with a thin line and a letter badge.
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_HIT_WIDTH,
    alignItems: 'center',
  },
  handleLine: {
    flex: 1,
    width: HANDLE_LINE_WIDTH,
    backgroundColor: colors.accent,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  badgeLabel: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: fontWeight.medium,
  },
  playhead: {
    position: 'absolute',
    top: BADGE_SIZE + space.sm,
    bottom: space.xs,
    width: PLAYHEAD_WIDTH,
    marginLeft: -PLAYHEAD_WIDTH / 2,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  loadingLabel: {
    ...type.body,
    color: colors.textMuted,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  timecode: {
    ...type.timecode,
  },
  cardRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  card: {
    flex: 1,
    minWidth: 0,
    gap: space.sm,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.borderButton,
    borderRadius: radius.md,
  },
  cardLength: {
    borderColor: colors.accentBorderDeep,
    backgroundColor: colors.accentRegionFill,
  },
  cardLabel: {
    ...type.kicker,
    color: colors.textMuted,
  },
  cardValue: {
    color: colors.text,
    fontFamily: fontFamily.mono,
    fontSize: VALUE_SIZE,
  },
  cardValueAccent: {
    color: colors.accentText,
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: space.xs,
  },
  nudgeButton: {
    flex: 1,
    minHeight: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderButton,
    borderRadius: radius.md,
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl,
  },
  transportButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  transportRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderWidth: RING_WIDTH,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: RING_GLOW_OPACITY,
    shadowRadius: RING_GLOW_RADIUS,
  },
  transportSeek: {
    width: space.touchTarget,
    height: space.touchTarget,
  },
  boundaryRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  nameInput: {
    minHeight: space.touchTarget,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.borderButton,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
});
