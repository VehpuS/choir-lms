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
    gap: 12,
  },
  playlistRowControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playlistRowCopy: {
    gap: 6,
  },
  playlistRowControlSpacer: {
    flex: 1,
  },
  playlistRowDragHandle: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  playlistRowDragHandleDisabled: {
    opacity: 0.56,
  },
  playlistRowStepControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  playlistRowStepButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PLAYLIST_BORDER_COLOR,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  playlistRowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
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
