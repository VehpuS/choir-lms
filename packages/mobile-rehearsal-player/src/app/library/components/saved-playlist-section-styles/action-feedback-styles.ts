import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import {
  PLAYLIST_BORDER_COLOR,
  PLAYLIST_ERROR_SURFACE,
  PLAYLIST_ERROR_TEXT,
  PLAYLIST_PRIMARY_ACTION_BACKGROUND,
  PLAYLIST_PRIMARY_ACTION_TEXT,
  PLAYLIST_PRIMARY_TEXT,
} from './shared';

type PlaylistStyleGroup = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const playlistActionFeedbackStyles = {
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactIconButton: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
  },
  primaryButtonLabel: {
    color: PLAYLIST_PRIMARY_ACTION_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  detailPlaybackActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailPlaybackAction: {
    alignSelf: 'flex-start',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 999,
  },
  detailPlaybackActionPrimary: {
    borderColor: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
    backgroundColor: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
  },
  detailPlaybackActionSecondary: {
    borderColor: PLAYLIST_BORDER_COLOR,
    backgroundColor: '#fffdf8',
  },
  detailPlaybackActionSelected: {
    borderWidth: 2,
  },
  detailPlaybackActionPrimaryLabel: {
    color: PLAYLIST_PRIMARY_ACTION_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  detailPlaybackActionSecondaryLabel: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  destructiveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PLAYLIST_ERROR_TEXT,
    borderRadius: 999,
    backgroundColor: PLAYLIST_ERROR_SURFACE,
  },
  destructiveIconButton: {
    alignSelf: 'flex-start',
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  inlineRowIconButton: {
    marginTop: 1,
  },
  destructiveButtonLabel: {
    color: PLAYLIST_ERROR_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  iconOnlyDestructiveButton: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueCard: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: PLAYLIST_ERROR_SURFACE,
  },
  issueTitle: {
    color: PLAYLIST_ERROR_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  issueMessage: {
    color: PLAYLIST_ERROR_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  snackbarCard: {
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#efe9db',
  },
  modalSnackbarCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#1f1c17',
    shadowOpacity: 0.16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowRadius: 10,
    elevation: 5,
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
