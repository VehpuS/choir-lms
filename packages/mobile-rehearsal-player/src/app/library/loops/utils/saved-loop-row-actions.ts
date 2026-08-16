import {
  getCompactPlaybackActionIconName,
  type DriveLibrarySourceAction,
} from '../../drive/utils/drive-library-source-actions';

type SavedLoopPlaybackAction = {
  disabled: boolean;
  label: string;
};

type ResolveSavedLoopRowActionsOptions = {
  canEditLoop: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  hasPlayableItem: boolean;
  isEditingLoop: boolean;
  itemName: string;
  isLoopMutating: boolean;
  isPendingRemoval: boolean;
  isPlaylistMutating: boolean;
  onEdit: () => void;
  onEditTags: () => void;
  onOpenPlaylistSelector: () => void;
  onQueueNext: () => void;
  onQueueUpNext: () => void;
  onRemove: () => void;
  onTogglePlayback: () => void;
  playbackAction: SavedLoopPlaybackAction;
};

export const resolveSavedLoopRowActions = (
  options: ResolveSavedLoopRowActionsOptions,
): DriveLibrarySourceAction[] => {
  const actions: DriveLibrarySourceAction[] = [
    {
      accessibilityLabel: `${options.playbackAction.label} ${options.itemName}`,
      disabled: options.playbackAction.disabled,
      iconName: getCompactPlaybackActionIconName(options.playbackAction.label),
      label: options.playbackAction.label,
      onPress: options.onTogglePlayback,
      placement: 'inline',
      tone: 'primary',
    },
  ];

  if (options.canQueueAsNext && options.hasPlayableItem) {
    actions.push(
      {
        disabled: false,
        label: 'Play next',
        onPress: options.onQueueNext,
        placement: 'menu',
      },
      {
        disabled: false,
        label: 'Add to queue',
        onPress: options.onQueueUpNext,
        placement: 'menu',
      },
    );
  }

  actions.push(
    {
      disabled: !options.canMutatePlaylists || options.isPlaylistMutating,
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
      disabled:
        !options.canEditLoop || options.isEditingLoop || options.isLoopMutating,
      label: options.isEditingLoop ? 'Editing…' : 'Edit loop',
      onPress: options.onEdit,
      placement: 'menu',
    },
    {
      disabled: !options.canMutateLoops || options.isLoopMutating,
      label: 'Edit tags',
      onPress: options.onEditTags,
      placement: 'menu',
    },
    {
      disabled: !options.canMutateLoops || options.isLoopMutating,
      label: options.isPendingRemoval ? 'Removing…' : 'Remove',
      onPress: options.onRemove,
      placement: 'menu',
      tone: 'destructive',
    },
  );

  return actions;
};
