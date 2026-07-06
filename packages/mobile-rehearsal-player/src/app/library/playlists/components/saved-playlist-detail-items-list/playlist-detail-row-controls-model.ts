import type { OptionsMenuAction } from '../../../components/options-menu-sheet/model';
import {
  getSavedPlaylistDetailPlaybackAction,
  type SavedPlaylistDetailPlaybackAction,
} from '../../utils/saved-playlist-detail-view-model';

export type PlaylistDetailRowMenuActionModel = Pick<
  OptionsMenuAction,
  'disabled' | 'id' | 'label' | 'tone'
> & {
  kind: 'move-to-position' | 'remove';
};

export type PlaylistDetailRowControlState = {
  canDragReorder: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isPlaybackButtonDisabled: boolean;
  menuActions: PlaylistDetailRowMenuActionModel[];
  playbackAction: SavedPlaylistDetailPlaybackAction;
  rowStatusLabel: 'Current' | 'Playing' | 'Ready' | 'Unavailable';
};

const getPlaylistDetailRowStatusLabel = (options: {
  isCurrentEntry: boolean;
  isItemPlayable: boolean;
  playbackToggleLabel: string;
}): PlaylistDetailRowControlState['rowStatusLabel'] => {
  if (options.isCurrentEntry) {
    return options.playbackToggleLabel === 'Pause' ? 'Playing' : 'Current';
  }

  if (options.isItemPlayable) {
    return 'Ready';
  }

  return 'Unavailable';
};

export const getPlaylistDetailRowControlState = (options: {
  entryId: string;
  entryTitle: string;
  index: number;
  isCurrentEntry: boolean;
  isItemPlayable: boolean;
  isMutating: boolean;
  itemCount: number;
  playbackToggleDisabled: boolean;
  playbackToggleLabel: string;
}): PlaylistDetailRowControlState => {
  const canMoveUp = options.index > 0;
  const canMoveDown = options.index < options.itemCount - 1;
  const canMoveToPosition = options.itemCount > 1;
  const canDragReorder = canMoveToPosition && !options.isMutating;
  const playbackAction = getSavedPlaylistDetailPlaybackAction({
    isCurrentEntry: options.isCurrentEntry,
    playbackToggleLabel: options.playbackToggleLabel,
    title: options.entryTitle,
  });

  return {
    canDragReorder,
    canMoveDown,
    canMoveUp,
    isPlaybackButtonDisabled:
      options.isMutating ||
      options.playbackToggleDisabled ||
      (!options.isCurrentEntry && !options.isItemPlayable),
    menuActions: [
      {
        disabled: !canMoveToPosition,
        id: `${options.entryId}:move-to-position`,
        kind: 'move-to-position',
        label: 'Move to position',
      },
      {
        disabled: options.isMutating,
        id: `${options.entryId}:remove`,
        kind: 'remove',
        label: 'Remove from playlist',
        tone: 'destructive',
      },
    ],
    playbackAction,
    rowStatusLabel: getPlaylistDetailRowStatusLabel(options),
  };
};
