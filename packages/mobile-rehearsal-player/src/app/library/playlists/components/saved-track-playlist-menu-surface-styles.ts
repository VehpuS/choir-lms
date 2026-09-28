import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

export const savedTrackPlaylistMenuSurfaceStyles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  nameInput: {
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: appTheme.space.md,
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.surface,
    color: appTheme.colors.text,
    fontSize: 15,
  },
  playlistList: {
    maxHeight: 280,
  },
});
