import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

const { colors, fontFamily, radius, space, type } = appTheme;

// Screen 1i: the speed and pitch sheet.
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 14;
const DETENT_TICK_WIDTH = 1;
const DETENT_TICK_HEIGHT = 12;
const SCALE_LABEL_BOX_WIDTH = 48;
const SCALE_LABEL_SIZE = 11;
const STEP_BUTTON_SIZE = 46;
const STRIP_HEIGHT = 24;
const STRIP_IDLE_BAR_HEIGHT = 12;
const STRIP_BAR_WIDTH = 2;
const SECTION_TEXT_SIZE = 12;
const NOTE_TEXT_SIZE = 12;

export const SPEED_THUMB_SIZE = THUMB_SIZE;
export const SCALE_LABEL_WIDTH = SCALE_LABEL_BOX_WIDTH;

export const shapingStyles = StyleSheet.create({
  section: {
    gap: space.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    ...type.kicker,
    color: colors.textMuted,
  },
  readout: {
    ...type.numericReadout,
    fontSize: 19,
  },
  readoutIdle: {
    color: colors.textMuted,
  },
  helper: {
    color: colors.textMuted,
    fontSize: SECTION_TEXT_SIZE,
  },
  contextTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  contextMeta: {
    color: colors.textMuted,
    fontSize: SECTION_TEXT_SIZE,
  },
  contextBlock: {
    flex: 1,
    gap: space.xxs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  // Speed slider: the detent tick and scale labels are placed by ratio.
  sliderFrame: {
    justifyContent: 'center',
    minHeight: 44,
  },
  detentTick: {
    position: 'absolute',
    top: (44 - DETENT_TICK_HEIGHT) / 2,
    width: DETENT_TICK_WIDTH,
    height: DETENT_TICK_HEIGHT,
    backgroundColor: colors.textFaint,
  },
  scaleRow: {
    height: 16,
  },
  scaleLabel: {
    position: 'absolute',
    width: SCALE_LABEL_BOX_WIDTH,
    textAlign: 'center',
    color: colors.textFaint,
    fontFamily: fontFamily.mono,
    fontSize: SCALE_LABEL_SIZE,
  },
  scaleLabelFirst: {
    left: 0,
    textAlign: 'left',
  },
  scaleLabelLast: {
    right: 0,
    textAlign: 'right',
  },
  trackStyle: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
  },
  thumbStyle: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  chipRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  // Pitch stepper.
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  stepButton: {
    width: STEP_BUTTON_SIZE,
    height: STEP_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderButton,
    borderRadius: radius.md,
  },
  strip: {
    flex: 1,
    height: STRIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripBar: {
    width: STRIP_BAR_WIDTH,
    height: STRIP_IDLE_BAR_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
  },
  stripBarZero: {
    height: STRIP_HEIGHT,
    backgroundColor: colors.text,
  },
  stripBarFilled: {
    backgroundColor: colors.accent,
  },
  inertReason: {
    color: colors.textMuted,
    fontSize: SECTION_TEXT_SIZE,
  },
  // Pinned under the scrolling body so the session scope is always in view.
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sheetInset,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
  footerText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: NOTE_TEXT_SIZE,
  },
  resetButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  resetLabel: {
    ...type.button,
    color: colors.accentText,
  },
  resetLabelDisabled: {
    color: colors.textFaint,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
});
