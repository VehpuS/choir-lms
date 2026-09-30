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
    backgroundColor: appTheme.colors.divider,
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
  subtitle: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  queuePlaylistActionRow: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
    marginTop: appTheme.space.xxs,
  },
  transportRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueRowShell: {
    alignItems: 'flex-start',
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
    backgroundColor: appTheme.colors.surface,
  },
  queueCardCurrent: {
    borderColor: appTheme.colors.accent,
    backgroundColor: appTheme.colors.accentRegionFill,
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
