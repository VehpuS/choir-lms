import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { PLAYLIST_PRIMARY_TEXT } from './shared';

import { appTheme } from '../../../utils/theme';

type PlaylistStyleGroup = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const playlistRowStyles = {
  playlistRowShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xxs,
  },
  playlistRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  playlistRowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  secondaryButtonLabel: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: appTheme.fontWeight.medium,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
} satisfies PlaylistStyleGroup;
