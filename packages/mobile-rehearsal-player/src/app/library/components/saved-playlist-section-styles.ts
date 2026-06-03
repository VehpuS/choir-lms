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
    position: 'relative',
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
    position: 'relative',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    backgroundColor: '#faf6ee',
  },
  playlistCardSelected: {
    borderColor: PRIMARY_ACTION_BACKGROUND,
    backgroundColor: '#f1f7f3',
  },
  playlistName: {
    paddingRight: 44,
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  playlistMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    lineHeight: 16,
  },
  playlistPreview: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    lineHeight: 16,
  },
  itemCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
  itemCardActive: {
    borderColor: PRIMARY_ACTION_BACKGROUND,
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
  itemHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  itemTitle: {
    flex: 1,
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  itemStatusActive: {
    color: PRIMARY_ACTION_BACKGROUND,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  itemStatusReady: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  itemStatusUnavailable: {
    color: ERROR_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dragHandleLabel: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  dragHandleButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
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
  fabButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 12,
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
  compactIconButton: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  destructiveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: ERROR_TEXT,
    borderRadius: 999,
    backgroundColor: ERROR_SURFACE,
  },
  destructiveIconButton: {
    alignSelf: 'flex-start',
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  inlineRowIconButton: {
    marginTop: 1,
  },
  secondaryButtonLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  destructiveButtonLabel: {
    color: ERROR_TEXT,
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
  playbackActionRow: {
    alignItems: 'flex-end',
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
    color: PRIMARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
});
