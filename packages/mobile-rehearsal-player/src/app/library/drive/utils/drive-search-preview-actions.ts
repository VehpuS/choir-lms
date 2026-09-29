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
  onOpenInGoogleDrive: () => void;
  onPreviewPlayback: () => void;
  onRemoveSource: () => void;
  onSaveSource: () => void;
  playbackState: SavedTrackPlaybackState | undefined;
  source: DriveLibrarySource;
};

const OPEN_IN_GOOGLE_DRIVE_LABEL = 'Open in Google Drive';
const PLAY_PREVIEW_LABEL = 'Play preview';

/**
 * Actions for an Add audio row (screen 1e). Inline: the preview ring, then an
 * accent `Save` pill or, once saved, a neutral `✓ Saved` toggle that starts
 * removal (behind the existing confirmation). Menu (on every
 * row): preview playback, `Save to Library` / `Remove from library`, and
 * `Open in Google Drive` (the file's own Drive page). A file outside the
 * supported audio set only offers `Open in Google Drive`.
 */
export const resolveDriveSourceActions = (
  options: ResolveDriveSearchSourceActionsOptions,
): DriveLibrarySourceAction[] => {
  const { source } = options;
  const openInGoogleDriveAction: DriveLibrarySourceAction = {
    disabled: !source.webViewLink,
    label: OPEN_IN_GOOGLE_DRIVE_LABEL,
    onPress: options.onOpenInGoogleDrive,
    placement: 'menu',
  };

  if (source.availability.status !== 'available') {
    return [openInGoogleDriveAction];
  }

  const playableItem = createTrackPlayableItem(source);
  const playbackAction = getSavedTrackPlaybackActionCopy({
    activePlayableItem: options.activePlayableItem,
    isPreparing: options.isPreparingPlayback,
    playableItem,
    playbackState: options.playbackState,
  });
  const isPlaybackDisabled =
    options.isLibraryMutating || playbackAction.disabled;
  const canMutateSource =
    options.canMutateLibrary &&
    !options.isLibraryLoading &&
    !options.isLibraryMutating;

  return [
    {
      accessibilityLabel: `${playbackAction.label} ${source.name}`,
      disabled: isPlaybackDisabled,
      iconName: getCompactPlaybackActionIconName(playbackAction.label),
      label: playbackAction.label,
      onPress: options.onPreviewPlayback,
      placement: 'inline',
      tone: 'primary',
    },
    options.isSaved
      ? {
          accessibilityHint: 'Removes it from your library after you confirm',
          accessibilityLabel: `${source.name} is saved to Library`,
          disabled: !canMutateSource,
          kind: 'saved-toggle',
          label: options.isSavePending ? 'Removing…' : 'Saved',
          onPress: options.onRemoveSource,
          placement: 'inline',
        }
      : {
          accessibilityLabel: `Save ${source.name} to Library`,
          disabled: !canMutateSource,
          label: options.isSavePending ? 'Saving…' : 'Save',
          onPress: options.onSaveSource,
          placement: 'inline',
        },
    {
      disabled: isPlaybackDisabled,
      label:
        playbackAction.label === 'Play'
          ? PLAY_PREVIEW_LABEL
          : playbackAction.label,
      onPress: options.onPreviewPlayback,
      placement: 'menu',
    },
    options.isSaved
      ? {
          disabled: !canMutateSource,
          label: 'Remove from library',
          onPress: options.onRemoveSource,
          placement: 'menu',
          tone: 'destructive',
        }
      : {
          disabled: !canMutateSource,
          label: 'Save to Library',
          onPress: options.onSaveSource,
          placement: 'menu',
        },
    openInGoogleDriveAction,
  ];
};
