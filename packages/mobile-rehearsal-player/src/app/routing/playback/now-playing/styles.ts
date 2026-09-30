import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

const { colors, fontFamily, fontWeight, radius, space, type } = appTheme;

// Screen 1f: the now-playing sheet.
const GRABBER_WIDTH = 52;
const GRABBER_HEIGHT = 4;
const STATUS_KICKER_SIZE = 11;
const PRACTICE_TILE_SIZE = 52;
const LOOP_CHIP_TEXT_SIZE = 13;
const CONTEXT_TEXT_SIZE = 14;
const NEXT_TEXT_SIZE = 12;
const TRANSPORT_RING_WIDTH = 1.5;
const TRANSPORT_GLOW_OPACITY = 0.3;
const TRANSPORT_GLOW_RADIUS = 18;

export const nowPlayingStyles = StyleSheet.create({
  // A flush bottom sheet capped to the space above it; its body scrolls.
  sheet: {
    flexShrink: 1,
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
    gap: space.md,
    paddingHorizontal: space.sheetInset,
    paddingTop: space.sm,
  },
  headerKicker: {
    ...type.kicker,
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    gap: space.lg,
    paddingHorizontal: space.sheetInset,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
  },
  titleBlock: {
    gap: space.xs,
  },
  statusKicker: {
    color: colors.accentText,
    fontSize: STATUS_KICKER_SIZE,
    fontWeight: fontWeight.medium,
    letterSpacing: type.kicker.letterSpacing,
    textTransform: 'uppercase',
  },
  title: {
    ...type.nowPlayingTitle,
    color: colors.text,
  },
  contextText: {
    color: colors.textMuted,
    fontSize: CONTEXT_TEXT_SIZE,
  },
  downloadText: {
    color: colors.accentText,
    fontSize: NEXT_TEXT_SIZE,
  },
  nextText: {
    color: colors.textMuted,
    fontSize: NEXT_TEXT_SIZE,
  },
  loopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: space.touchTarget,
    marginTop: space.sm,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
  },
  loopChipText: {
    color: colors.accentText,
    fontFamily: fontFamily.mono,
    fontSize: LOOP_CHIP_TEXT_SIZE,
  },
  timeline: {
    gap: space.xs,
  },
  timelineScale: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timecode: {
    ...type.timecode,
  },
  transportRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
  },
  // Width and height come from the transport appearance model.
  transportButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  // 1f: an accent ring with an ambient glow, never a filled disc.
  transportRing: {
    borderWidth: TRANSPORT_RING_WIDTH,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: TRANSPORT_GLOW_OPACITY,
    shadowRadius: TRANSPORT_GLOW_RADIUS,
  },
  practiceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.sm,
  },
  practiceTile: {
    width: PRACTICE_TILE_SIZE,
    height: PRACTICE_TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderButton,
    borderRadius: radius.md,
  },
  practiceTileSelected: {
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  volumeSlider: {
    flex: 1,
  },
});
