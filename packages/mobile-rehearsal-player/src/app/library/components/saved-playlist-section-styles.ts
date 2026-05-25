import { StyleSheet } from 'react-native';

const BORDER_COLOR = '#d6d1c4';
const ERROR_SURFACE = '#fff1ed';
const ERROR_TEXT = '#8a2d1f';
const INPUT_BACKGROUND = '#fff9f0';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

export const SAVED_PLAYLIST_PLACEHOLDER_TEXT = '#857b6c';

export const savedPlaylistSectionStyles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionCopy: {
    gap: 8,
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: PRIMARY_TEXT,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  sectionBody: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  editorCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#fffdf8',
  },
  editorTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  editorBody: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  nameInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    backgroundColor: INPUT_BACKGROUND,
    color: PRIMARY_TEXT,
    fontSize: 15,
  },
  group: {
    gap: 12,
  },
  groupTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  groupItems: {
    gap: 12,
  },
  playlistCard: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
  playlistCardSelected: {
    borderColor: PRIMARY_ACTION_BACKGROUND,
    backgroundColor: '#f1f7f3',
  },
  playlistName: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  playlistMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  playlistPreview: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  itemCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
  itemTitle: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  itemMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyMessage: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  primaryButtonLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  secondaryButtonLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  issueCard: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: ERROR_SURFACE,
  },
  issueTitle: {
    color: ERROR_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  issueMessage: {
    color: ERROR_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
});
