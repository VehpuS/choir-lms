import {
  getCompactPlaybackActionIconName,
  type DriveLibrarySourceAction,
} from '../../drive/utils/drive-library-source-actions';

type SavedTrackPlaybackAction = {
  disabled: boolean;
  label: string;
};

type ResolveSavedTrackRowActionsOptions = {
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  hasSavedLoops: boolean;
  hasAvailableSource: boolean;
  isLoopBuilderPreparing: boolean;
  isLoopMutating: boolean;
  isPendingLoopSource: boolean;
  isPendingRemoval: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  onOpenLoopBuilder: () => void;
  onOpenTagEditor: () => void;
  onOpenPlaylistSelector: () => void;
  onQueueNext: () => void;
  onQueueUpNext: () => void;
  onRemove: () => void;
  onTogglePlayback: () => void;
  onViewTrackLoops: () => void;
  playbackAction: SavedTrackPlaybackAction;
  sourceName: string;
};

export const resolveSavedTrackRowActions = (
  options: ResolveSavedTrackRowActionsOptions,
): DriveLibrarySourceAction[] => {
  const canQueueSource =
    !options.isSavedLibraryMutating && options.hasAvailableSource;

  return [
    {
      accessibilityLabel: `${options.playbackAction.label} ${options.sourceName}`,
      disabled:
        options.isSavedLibraryMutating || options.playbackAction.disabled,
      iconName: getCompactPlaybackActionIconName(options.playbackAction.label),
      label: options.playbackAction.label,
      onPress: options.onTogglePlayback,
      placement: 'inline',
      tone: 'primary',
    },
    {
      disabled:
        !options.canMutateLoops ||
        options.isLoopMutating ||
        options.isLoopBuilderPreparing ||
        options.isSavedLibraryMutating ||
        !options.hasAvailableSource,
      label: options.isPendingLoopSource ? 'Preparing loop…' : 'Make loop',
      onPress: options.onOpenLoopBuilder,
      placement: 'menu',
    },
    ...(options.hasSavedLoops
      ? [
          {
            disabled: options.isSavedLibraryMutating,
            label: 'View track loops',
            onPress: options.onViewTrackLoops,
            placement: 'menu' as const,
          },
        ]
      : []),
    ...(options.canQueueAsNext
      ? [
          {
            disabled: !canQueueSource,
            label: 'Play next',
            onPress: options.onQueueNext,
            placement: 'menu' as const,
          },
          {
            disabled: !canQueueSource,
            label: 'Add to queue',
            onPress: options.onQueueUpNext,
            placement: 'menu' as const,
          },
        ]
      : []),
    {
      disabled:
        !options.canMutatePlaylists ||
        options.isPlaylistMutating ||
        options.isSavedLibraryMutating,
      label: !options.canMutatePlaylists
        ? 'Playlists unavailable'
        : options.isPlaylistMutating
          ? 'Updating playlist…'
          : 'Add to playlist',
      onPress: options.onOpenPlaylistSelector,
      placement: 'menu',
      tone: 'primary',
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      label: 'Edit tags',
      onPress: options.onOpenTagEditor,
      placement: 'menu',
    },
    {
      disabled:
        !options.canMutateLibrary ||
        options.isSavedLibraryMutating ||
        options.isLoopMutating,
      label: options.isPendingRemoval ? 'Removing…' : 'Remove',
      onPress: options.onRemove,
      placement: 'menu',
      tone: 'destructive',
    },
  ];
};
