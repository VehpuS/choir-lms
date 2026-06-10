import { StyleSheet } from 'react-native';

import { appTheme } from '../../utils/theme';

export const styles = StyleSheet.create({
  sheetCard: {
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 32,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  surfaceHandle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d0d8d2',
  },
  surfaceDragHandleRegion: {
    gap: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sheetEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerActionPressed: {
    opacity: 0.84,
  },
  headerActionDisabled: {
    opacity: 0.5,
  },
  summaryGroup: {
    gap: 4,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  statusCaption: {
    color: '#2d584a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  rangeLabel: {
    color: '#2d584a',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  inlineContextText: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  queuePlaylistActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  queuePlaylistPrimaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#305c4d',
  },
  queuePlaylistPrimaryActionLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
  queuePlaylistSecondaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#fffdf8',
  },
  queuePlaylistSecondaryActionLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
  },
  transportRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transportButtonPrimary: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#305c4d',
  },
  transportButtonSecondary: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  queueRowShell: {
    alignItems: 'flex-start',
  },
  queueRowDragHandle: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  queueRowDragHandleDisabled: {
    opacity: 0.5,
  },
  queueOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  queueList: {
    flexGrow: 0,
  },
  queueListContent: {
    gap: 12,
  },
  queueSurfaceTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  queueCard: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 18,
    backgroundColor: '#faf6ee',
  },
  queueCardCurrent: {
    borderColor: '#305c4d',
    backgroundColor: '#f1f7f3',
  },
  queueEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  queueTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  queueDetail: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
});
