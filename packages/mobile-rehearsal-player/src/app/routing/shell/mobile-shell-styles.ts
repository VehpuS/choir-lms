import { StyleSheet } from 'react-native';

import { appTheme } from '../../utils/theme';
import { RAIL_WIDTH } from './shell-dimensions';
import { SHELL_LAYERS } from './shell-layers';

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
  // The wide-short layout puts the side rail and the main column side by side.
  // The Now Playing pane is pulled over the list by a drag and carries a strip
  // of its surface out past the window's edge; clipped here, that strip cannot
  // make the page scroll sideways. `clip`, not `hidden`: a hidden box can still
  // be scrolled by a focus or `scrollIntoView`, which would carry the playback
  // sheet inside it along. react-native-web passes it through; the React Native
  // type does not list it.
  screenRow: {
    flexDirection: 'row',
    overflow: 'clip' as 'hidden',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
  },
  contentViewport: {
    flex: 1,
    zIndex: SHELL_LAYERS.contentViewport,
    paddingHorizontal: space.screenInset,
  },
  destinationPanel: {
    flex: 1,
  },
  // Settings shows over the destinations, not as a tab; absolute children
  // ignore the viewport's padding, so the screen carries its own inset.
  settingsOverlay: {
    backgroundColor: colors.bg,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  destinationPanelActive: {
    display: 'flex',
  },
  destinationPanelHidden: {
    display: 'none',
  },
  bottomDock: {
    zIndex: SHELL_LAYERS.bottomDock,
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
  // A quiet glyph beside the play ring: it opens the lyrics peek.
  miniPlayerLyricsButton: {
    width: appTheme.space.touchTarget,
    height: appTheme.space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
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
  // The Practice tools tab sits in a wrapper that anchors its menu; the wrapper
  // takes the tab's share of the row and the menu opens upward from it.
  tabAnchor: { flex: 1 },
  practiceToolsMenu: { bottom: '100%', right: 0, marginBottom: space.xs },
  // The rail's entries stack; the menu opens to the right of its entry,
  // over the content, and grows upward from the entry's bottom edge.
  practiceToolsRailMenu: { bottom: 0, left: '100%', marginLeft: space.xs },
  // The side rail (wide-short): the tab bar's entries in a column, on the same
  // raised surface with a hairline on the content side.
  rail: {
    width: RAIL_WIDTH,
    zIndex: SHELL_LAYERS.bottomDock,
    paddingVertical: space.md,
    gap: space.xs,
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
  },
  railTab: {
    minHeight: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: TAB_GAP,
    paddingVertical: space.xs,
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
