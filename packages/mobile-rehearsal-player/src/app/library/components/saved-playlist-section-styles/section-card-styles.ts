import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import {
  PLAYLIST_BORDER_COLOR,
  PLAYLIST_INPUT_BACKGROUND,
  PLAYLIST_PRIMARY_TEXT,
  PLAYLIST_SECONDARY_TEXT,
} from './shared';

import { appTheme } from '../../../utils/theme';

type PlaylistStyleGroup = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const playlistSectionCardStyles = {
  section: {
    gap: 12,
  },
  sectionCopy: {
    gap: 8,
  },
  eyebrow: {
    ...appTheme.type.kicker,
    color: PLAYLIST_SECONDARY_TEXT,
  },
  sectionTitle: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 24,
  },
  sectionBody: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmationAffectedList: {
    maxHeight: 176,
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.bg,
  },
  confirmationAffectedListContent: {
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  confirmationAffectedGroup: {
    gap: 6,
  },
  confirmationAffectedTitle: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 18,
  },
  confirmationAffectedItem: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  nameInput: {
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: appTheme.space.md,
    paddingVertical: appTheme.space.xs,
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: appTheme.radius.md,
    backgroundColor: PLAYLIST_INPUT_BACKGROUND,
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 15,
  },
  group: {
    gap: 12,
  },
  groupTitle: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: appTheme.fontWeight.medium,
  },
  groupItems: {
    gap: 12,
  },
  // Playlist detail items are flat rows divided by hairlines (screen 1h);
  // the current item is marked by its accent title, never a fill.
  itemRow: {
    paddingVertical: 11,
  },
  itemRowSeparated: {
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.hairline,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.space.sm,
  },
  itemsHeading: {
    ...appTheme.type.kicker,
    color: PLAYLIST_SECONDARY_TEXT,
  },
  itemRowUnavailable: {
    opacity: 0.72,
  },
  itemTitle: {
    ...appTheme.type.rowTitle,
    color: PLAYLIST_PRIMARY_TEXT,
  },
  itemTitleCurrent: {
    color: appTheme.colors.accentText,
  },
  itemStatusActive: {
    color: appTheme.colors.accentText,
    fontWeight: appTheme.fontWeight.medium,
  },
  itemStatusUnavailable: {
    color: appTheme.colors.danger,
    fontWeight: appTheme.fontWeight.medium,
  },
  itemMetadata: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyMessage: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
} satisfies PlaylistStyleGroup;
