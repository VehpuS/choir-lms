import { StyleSheet } from 'react-native';

import { appTheme } from '../../utils/theme';

const { colors, space } = appTheme;

const MINI_PLAYER_TOGGLE_SIZE = 46;
const MINI_PLAYER_WAVEFORM_WIDTH = 34;
const PROGRESS_LINE_HEIGHT = 2;
const TAB_MARK_WIDTH = 16;
const TAB_MARK_HEIGHT = 2;
const TAB_GAP = 5;
const PRESSED_OPACITY = 0.88;
const DISABLED_OPACITY = 0.5;

// Mini-player and tab bar render as one flush band (screens 1a–1e):
// `surfaceRaised` with a hairline top edge, no floating cards.
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.bg,
  },
  contentViewport: {
    flex: 1,
    paddingHorizontal: space.screenInset,
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
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
  },
  miniPlayer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 11,
  },
  miniPlayerBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: space.touchTarget,
  },
  miniPlayerPressed: {
    opacity: PRESSED_OPACITY,
  },
  miniPlayerWaveform: {
    width: MINI_PLAYER_WAVEFORM_WIDTH,
  },
  miniPlayerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  miniPlayerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: appTheme.fontWeight.medium,
  },
  miniPlayerTitleWrap: {
    minHeight: 19,
  },
  miniPlayerContext: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: [...appTheme.tabularNumbers],
    lineHeight: 15,
  },
  miniPlayerActionButton: {
    width: MINI_PLAYER_TOGGLE_SIZE,
    height: MINI_PLAYER_TOGGLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: appTheme.radius.pill,
    backgroundColor: colors.transparent,
    // Ambient accent glow around the ring (README: 0 0 14px accent .28).
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  miniPlayerActionDisabled: {
    opacity: DISABLED_OPACITY,
  },
  miniPlayerProgressLine: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: PROGRESS_LINE_HEIGHT,
    backgroundColor: colors.accent,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingHorizontal: space.xs,
    paddingBottom: space.xs,
  },
  tab: {
    flex: 1,
    minHeight: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: TAB_GAP,
  },
  tabPressed: {
    opacity: PRESSED_OPACITY,
  },
  // The spacer keeps inactive glyphs aligned with the active one.
  tabMark: {
    width: TAB_MARK_WIDTH,
    height: TAB_MARK_HEIGHT,
    borderRadius: appTheme.radius.pill,
  },
  tabMarkActive: {
    backgroundColor: colors.accent,
  },
  tabLabel: {
    ...appTheme.type.tabLabel,
  },
});
