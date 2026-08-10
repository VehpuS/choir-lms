import { StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import {
  PLAYLIST_BORDER_COLOR,
  PLAYLIST_PRIMARY_TEXT,
  PLAYLIST_SECONDARY_TEXT,
} from './shared';

type PlaylistStyleGroup = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const playlistRowStyles = {
  dragHandleLabel: {
    color: PLAYLIST_SECONDARY_TEXT,
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
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  playlistRowShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playlistRowDragHandle: {
    width: 20,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistRowDragHandleDisabled: {
    opacity: 0.56,
  },
  playlistRowPlayButton: {
    width: 30,
    height: 30,
  },
  playlistRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  playlistRowStepper: {
    width: 22,
    height: 38,
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 6,
    overflow: 'hidden',
  },
  playlistRowStepperButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistRowStepperDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PLAYLIST_BORDER_COLOR,
  },
  playlistRowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
    minWidth: 28,
    minHeight: 30,
    paddingHorizontal: 0,
  },
  secondaryButtonLabel: {
    color: PLAYLIST_PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
} satisfies PlaylistStyleGroup;
