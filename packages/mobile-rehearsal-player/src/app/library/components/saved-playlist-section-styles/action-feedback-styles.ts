import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import {
  PLAYLIST_BUTTON_BORDER_COLOR,
  PLAYLIST_ERROR_SURFACE,
  PLAYLIST_ERROR_TEXT,
  PLAYLIST_PRIMARY_ACTION_BORDER,
  PLAYLIST_PRIMARY_ACTION_TEXT,
  PLAYLIST_PRIMARY_TEXT,
} from './shared';

import { appTheme } from '../../../utils/theme';

type PlaylistStyleGroup = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const playlistActionFeedbackStyles = {
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactIconButton: {
    alignSelf: 'flex-start',
    width: appTheme.space.touchTarget,
    height: appTheme.space.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PLAYLIST_BUTTON_BORDER_COLOR,
    borderRadius: appTheme.radius.md,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    minHeight: appTheme.space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: appTheme.space.lg,
    borderWidth: 1,
    borderColor: PLAYLIST_PRIMARY_ACTION_BORDER,
    borderRadius: appTheme.radius.md,
  },
  primaryButtonLabel: {
    ...appTheme.type.button,
    color: PLAYLIST_PRIMARY_ACTION_TEXT,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    minHeight: appTheme.space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: appTheme.space.lg,
    borderWidth: 1,
    borderColor: PLAYLIST_BUTTON_BORDER_COLOR,
    borderRadius: appTheme.radius.md,
  },
  destructiveButton: {
    alignSelf: 'flex-start',
    minHeight: appTheme.space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: appTheme.space.lg,
    borderWidth: 1,
    borderColor: appTheme.colors.dangerEdge,
    borderRadius: appTheme.radius.md,
  },
  destructiveButtonLabel: {
    ...appTheme.type.button,
    color: PLAYLIST_ERROR_TEXT,
  },
  issueCard: {
    gap: 4,
    padding: 12,
    borderRadius: appTheme.radius.md,
    backgroundColor: PLAYLIST_ERROR_SURFACE,
  },
  issueTitle: {
    color: PLAYLIST_ERROR_TEXT,
    fontSize: 13,
    fontWeight: appTheme.fontWeight.medium,
  },
  issueMessage: {
    color: PLAYLIST_ERROR_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  snackbarCard: {
    gap: 10,
    padding: 12,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.surface,
  },
  modalSnackbarCard: {
    ...appTheme.elevation.raised,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  snackbarModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  snackbarMessage: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
} satisfies PlaylistStyleGroup;
