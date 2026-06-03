import { StyleSheet } from 'react-native';

import { appTheme } from '../utils/theme';

export const recentsScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  content: {
    gap: 12,
    paddingTop: 10,
    paddingBottom: 18,
  },
  hero: {
    gap: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 16,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  kicker: {
    color: appTheme.colors.heroBackground,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    color: appTheme.colors.heroBackground,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusValue: {
    color: appTheme.colors.primaryText,
    fontSize: 20,
    fontWeight: '700',
  },
  statusValueList: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  shortcutsCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  resumeCard: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    backgroundColor: appTheme.colors.cardBackground,
  },
  resumeCardEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  resumeCardTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 19,
    fontWeight: '700',
  },
  resumeCardBody: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  recentItemRow: {
    marginTop: 8,
  },
  recentItemTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '600',
  },
  recentItemMeta: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    lineHeight: 16,
  },
  shortcutsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  shortcutsCopy: {
    flex: 1,
    gap: 4,
  },
  shortcutsTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 17,
    fontWeight: '700',
  },
  shortcutsBody: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  shortcutsMeta: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.pageBackground,
  },
  tagLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  tagPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surfaceBackground,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  iconActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surfaceBackground,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  iconActionButtonPressed: {
    opacity: 0.75,
  },
  iconActionButtonDisabled: {
    opacity: 0.45,
  },
});
