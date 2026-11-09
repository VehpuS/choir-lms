export type RecentsOverflowActionState = {
  disabled: boolean;
  id: 'add-to-queue' | 'play-next' | 'queue-playlist' | 'view-in-library';
  label: string;
};

export const getRecentsOverflowActionState = (options: {
  canQueueAsNext: boolean;
  isPlaylist?: boolean;
  isViewInLibraryAvailable: boolean;
}) => {
  const viewInLibrary = {
    disabled: !options.isViewInLibraryAvailable,
    id: 'view-in-library',
    label: 'View in library',
  } satisfies RecentsOverflowActionState;

  // A playlist has no single item to play next, so it offers one queueing
  // action: append all of its items.
  if (options.isPlaylist) {
    return [
      {
        disabled: !options.canQueueAsNext,
        id: 'queue-playlist',
        label: 'Queue playlist',
      },
      viewInLibrary,
    ] satisfies RecentsOverflowActionState[];
  }

  return [
    {
      disabled: !options.canQueueAsNext,
      id: 'play-next',
      label: 'Play next',
    },
    {
      disabled: !options.canQueueAsNext,
      id: 'add-to-queue',
      label: 'Add to queue',
    },
    viewInLibrary,
  ] satisfies RecentsOverflowActionState[];
};
