import { StyleSheet } from 'react-native';

import { INTERACTION_STATE_OPACITY } from '../../components/interaction-style-tokens';
import { DRIVE_ROW_SAVE_PILL_WIDTH } from './drive-row-save-pill-model';
import { appTheme } from '../../../utils/theme';

const { colors, space } = appTheme;

export const DRIVE_ROW_LEADING_GLYPH_SIZE = 20;
/** Long Drive names wrap once before ellipsizing (the sheet shows them in full). */
export const DRIVE_ROW_TITLE_LINES = 2;

// Save / Saved pills draw 36pt tall (screen 1e) inside a 44pt hit area.
const PILL_HEIGHT = 36;
const PILL_HIT_EXTENSION = (space.touchTarget - PILL_HEIGHT) / 2;

export const DRIVE_ROW_PILL_HIT_SLOP = {
  bottom: PILL_HIT_EXTENSION,
  left: 0,
  right: 0,
  top: PILL_HIT_EXTENSION,
};

export const driveExplorerListStyles = StyleSheet.create({
  pill: {
    width: DRIVE_ROW_SAVE_PILL_WIDTH,
    minHeight: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    paddingHorizontal: space.xs,
    borderWidth: 1,
    borderRadius: appTheme.radius.pill,
    backgroundColor: colors.transparent,
  },
  pillAccent: {
    borderColor: colors.accent,
  },
  pillDisabled: {
    opacity: INTERACTION_STATE_OPACITY.disabled,
  },
  pillLabel: {
    ...appTheme.type.chip,
    fontWeight: appTheme.fontWeight.medium,
  },
  pillPressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  pillNeutral: {
    borderColor: colors.borderButton,
  },
  rowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  rowTitle: {
    ...appTheme.type.rowTitle,
    color: colors.text,
    lineHeight: 20,
  },
  rowTitleSelected: {
    color: colors.accentText,
  },
  sourceErrorMessage: {
    ...appTheme.type.rowMeta,
    color: colors.danger,
    lineHeight: 17,
  },
  trailingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
  },
});
