import { StyleSheet } from 'react-native';

const INPUT_BACKGROUND = '#fff9f0';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_ACTION_BACKGROUND = '#f2ece1';
const SECONDARY_TEXT = '#5f5647';

export const savedTrackPlaylistMenuSurfaceStyles = StyleSheet.create({
  playlistList: {
    maxHeight: 240,
  },
  playlistListContent: {
    gap: 10,
  },
  playlistRow: {
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: '#fffaf2',
  },
  playlistName: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  playlistMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyStateCard: {
    gap: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: '#fffaf2',
  },
  emptyStateTitle: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  emptyStateBody: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  nameInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: INPUT_BACKGROUND,
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '600',
  },
  issueCard: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff1ed',
  },
  issueTitle: {
    color: '#8a2d1f',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  issueMessage: {
    color: '#8a2d1f',
    fontSize: 13,
    lineHeight: 18,
  },
  actionColumn: {
    gap: 10,
  },
  primaryAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  primaryActionLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: SECONDARY_ACTION_BACKGROUND,
  },
  secondaryActionLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.56,
  },
});
