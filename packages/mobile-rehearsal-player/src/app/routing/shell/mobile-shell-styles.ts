import { StyleSheet } from 'react-native';

import { appTheme } from '../../utils/theme';

const SHELL_CONTENT_HORIZONTAL_PADDING = 14;
const HEADER_BOTTOM_RADIUS = 18;
const MINI_PLAYER_RADIUS = 18;
const TAB_BAR_RADIUS = 16;
const TAB_BAR_BACKGROUND = appTheme.colors.surfaceRaised;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    backgroundColor: appTheme.colors.pageBackground,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
  },
  headerCard: {
    position: 'relative',
    zIndex: 10,
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: HEADER_BOTTOM_RADIUS,
    borderBottomRightRadius: HEADER_BOTTOM_RADIUS,
    backgroundColor: appTheme.colors.heroBackground,
    overflow: 'visible',
  },
  headerTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    color: appTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: appTheme.colors.text,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  headerBody: {
    color: appTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  contentViewport: {
    flex: 1,
    paddingHorizontal: SHELL_CONTENT_HORIZONTAL_PADDING,
  },
  destinationPanel: {
    flex: 1,
  },
  destinationPanelActive: {
    display: 'flex',
  },
  destinationPanelHidden: {
    display: 'none',
  },
  bottomDock: {
    gap: 8,
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  bottomDockTabsOnly: {
    paddingTop: 2,
  },
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.divider,
    borderRadius: MINI_PLAYER_RADIUS,
    backgroundColor: appTheme.colors.surfaceRaised,
  },
  miniPlayerBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniPlayerPressed: {
    opacity: 0.9,
  },
  miniPlayerWaveform: {
    width: 74,
  },
  miniPlayerCopy: {
    flex: 1,
    gap: 2,
  },
  miniPlayerTitle: {
    color: appTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  miniPlayerTitleWrap: {
    minHeight: 22,
  },
  miniPlayerContext: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  miniPlayerActionButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: appTheme.colors.surfaceAccent,
  },
  miniPlayerActionDisabled: {
    opacity: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderWidth: 1,
    borderColor: appTheme.colors.divider,
    borderRadius: TAB_BAR_RADIUS,
    backgroundColor: TAB_BAR_BACKGROUND,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 6,
  },
  tabActive: {
    backgroundColor: appTheme.colors.surfaceAccent,
  },
  tabPressed: {
    opacity: 0.88,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: appTheme.colors.accentOnTint,
  },
});
