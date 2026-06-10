export type RecentsOverflowActionState = {
  disabled: boolean;
  id: 'add-to-queue' | 'play-next' | 'view-in-library';
  label: string;
};

export const getRecentsOverflowActionState = (options: {
  canQueueAsNext: boolean;
  isViewInLibraryAvailable: boolean;
}) => {
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
    {
      disabled: !options.isViewInLibraryAvailable,
      id: 'view-in-library',
      label: 'View in library',
    },
  ] satisfies RecentsOverflowActionState[];
};