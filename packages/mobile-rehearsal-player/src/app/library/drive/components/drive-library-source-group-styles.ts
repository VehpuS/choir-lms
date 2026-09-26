import { StyleSheet } from 'react-native';

import {
  INTERACTION_CARD_SHELL_TOKENS,
  INTERACTION_STATE_OPACITY,
} from '../../components/interaction-style-tokens';
import { appTheme } from '../../../utils/theme';

const BORDER_COLOR = INTERACTION_CARD_SHELL_TOKENS.borderColor;
const ERROR_SURFACE = appTheme.colors.dangerFill;
const ERROR_TEXT = appTheme.colors.danger;
export const DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT = appTheme.colors.text;
const READY_SURFACE = appTheme.colors.successFill;
const READY_TEXT = appTheme.colors.success;
const SECONDARY_TEXT = appTheme.colors.textMuted;
const WARNING_SURFACE = appTheme.colors.warningFill;
const WARNING_TEXT = appTheme.colors.warning;

export const driveLibrarySourceGroupStyles = StyleSheet.create({
  group: {
    gap: 12,
  },
  groupTitle: {
    color: DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  groupItems: {
    gap: 12,
  },
  sourceCard: {
    position: 'relative',
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: INTERACTION_CARD_SHELL_TOKENS.mutedBackground,
  },
  sourceName: {
    color: DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  sourceMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  sourceMessage: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  sourceErrorMessage: {
    color: ERROR_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  badgeReady: {
    backgroundColor: READY_SURFACE,
  },
  badgeReadyLabel: {
    color: READY_TEXT,
  },
  badgeWarning: {
    backgroundColor: WARNING_SURFACE,
  },
  badgeWarningLabel: {
    color: WARNING_TEXT,
  },
  badgeError: {
    backgroundColor: ERROR_SURFACE,
  },
  badgeErrorLabel: {
    color: ERROR_TEXT,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  actionButtonNeutral: {
    borderColor: BORDER_COLOR,
    backgroundColor: INTERACTION_CARD_SHELL_TOKENS.surfaceBackground,
  },
  actionButtonPrimary: {
    borderColor: appTheme.colors.accent,
    backgroundColor: appTheme.colors.surfaceAccent,
  },
  actionButtonPressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  actionButtonDisabled: {
    opacity: INTERACTION_STATE_OPACITY.disabled,
  },
  actionButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonNeutralLabel: {
    color: DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT,
  },
  actionButtonPrimaryLabel: {
    color: appTheme.colors.text,
  },
});
