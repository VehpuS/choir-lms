import {
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';

import type { DriveLibrarySourceAction } from '../components/DriveLibrarySourceGroup';
import type { DriveLibrarySource } from './drive-library-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  type SavedTrackPlaybackState,
} from './saved-track-playback-view-model';

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

const getPlaybackIconName = (label: string) => {
  return label === 'Pause' ? 'pause' : 'play';
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
      iconName: getPlaybackIconName(playbackAction.label),
      label: playbackAction.label,
      onPress: options.onPreviewPlayback,
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
    },
  ];
};
