import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import {
  PLAYLIST_BORDER_COLOR,
  PLAYLIST_INPUT_BACKGROUND,
  PLAYLIST_PRIMARY_ACTION_BACKGROUND,
  PLAYLIST_PRIMARY_TEXT,
  PLAYLIST_SECONDARY_TEXT,
} from './shared';

type PlaylistStyleGroup = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const playlistSectionCardStyles = {
  section: {
    gap: 12,
  },
  sectionCopy: {
    gap: 8,
  },
  eyebrow: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 18,
    fontWeight: '700',
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
    borderRadius: 12,
    backgroundColor: '#fff9f0',
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
    fontWeight: '700',
    lineHeight: 18,
  },
  confirmationAffectedItem: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  editorCard: {
    position: 'relative',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#fffdf8',
  },
  editorTitle: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  editorBody: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 14,
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
    fontWeight: '700',
  },
  groupItems: {
    gap: 12,
  },
  playlistCard: {
    position: 'relative',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 14,
    backgroundColor: '#faf6ee',
  },
  playlistCardSelected: {
    borderColor: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
    backgroundColor: '#f1f7f3',
  },
  playlistName: {
    paddingRight: 44,
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  playlistMetadata: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 12,
    lineHeight: 16,
  },
  playlistPreview: {
    color: PLAYLIST_SECONDARY_TEXT,
    fontSize: 12,
    lineHeight: 16,
  },
  itemCard: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 12,
    backgroundColor: '#faf6ee',
  },
  itemCardActive: {
    borderColor: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
    backgroundColor: '#f1f7f3',
  },
  itemCardUnavailable: {
    opacity: 0.72,
  },
  itemPressable: {
    gap: 8,
  },
  itemPressableContent: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemTitle: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  itemStatusActive: {
    color: PLAYLIST_PRIMARY_ACTION_BACKGROUND,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  itemStatusUnavailable: {
    color: '#8a2d1f',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
