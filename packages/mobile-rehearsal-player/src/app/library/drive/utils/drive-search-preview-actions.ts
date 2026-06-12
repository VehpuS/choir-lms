import {
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';

import {
  getSavedTrackPlaybackActionCopy,
  type SavedTrackPlaybackState,
} from '../../playback/utils/saved-track-playback-view-model';
import {
  getCompactPlaybackActionIconName,
  type DriveLibrarySourceAction,
} from './drive-library-source-actions';
import type { DriveLibrarySource } from './drive-library-view-model';

type ResolveDriveSearchSourceActionsOptions = {
  activePlayableItem: PlayableItem | null;
  canMutateLibrary: boolean;
  isLibraryLoading: boolean;
  isLibraryMutating: boolean;
  isPreparingPlayback: boolean;
  isSaved: boolean;
  isSavePending: boolean;
  onPreviewPlayback: () => void;
  onRemoveSource: () => void;
  onSaveSource: () => void;
  playbackState: SavedTrackPlaybackState | undefined;
  source: DriveLibrarySource;
};

export const resolveDriveSourceActions = (
  options: ResolveDriveSearchSourceActionsOptions,
): DriveLibrarySourceAction[] => {
  const playableItem = createTrackPlayableItem(options.source);
  const playbackAction = getSavedTrackPlaybackActionCopy({
    activePlayableItem: options.activePlayableItem,
    isPreparing: options.isPreparingPlayback,
    playableItem,
    playbackState: options.playbackState,
  });

  const canMutateSource =
    options.canMutateLibrary &&
    !options.isLibraryLoading &&
    !options.isLibraryMutating;

  return [
    {
      accessibilityLabel: `${playbackAction.label} ${options.source.name}`,
      disabled:
        options.isLibraryMutating ||
        options.source.availability.status !== 'available' ||
        playbackAction.disabled,
      iconName: getCompactPlaybackActionIconName(playbackAction.label),
      label: playbackAction.label,
      onPress: options.onPreviewPlayback,
      placement: 'inline',
      tone: 'primary',
    },
    {
      disabled: !canMutateSource,
      label: options.isSavePending
        ? options.isSaved
          ? 'Removing…'
          : 'Saving…'
        : options.isSaved
          ? 'Remove'
          : 'Save',
      onPress: options.isSaved ? options.onRemoveSource : options.onSaveSource,
      placement: options.isSaved ? 'menu' : 'inline',
    },
  ];
};
