import type { OptionsMenuAction } from '../options-menu-sheet/model';

export type FilesDeleteFromFolderCopy = {
  confirmLabel: string;
  message: string;
  title: string;
};

export const FOLDER_ACTION_ORDER = new Map([
  ['Edit tags', 0],
  ['Rename', 1],
  ['Move to folder', 2],
  ['Delete from folder', 3],
]);

export type SavedRowActionLike = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'destructive' | 'neutral' | 'primary';
};

export const toOptionsMenuAction = (options: {
  action: SavedRowActionLike;
  id: string;
}): OptionsMenuAction => {
  return {
    disabled: options.action.disabled,
    id: options.id,
    label: options.action.label,
    onPress: options.action.onPress,
    tone: options.action.tone === 'destructive' ? 'destructive' : 'secondary',
  };
};

export const sortActionsByLabelOrder = <T extends { label: string }>(
  actions: T[],
  order: ReadonlyMap<string, number>,
) => {
  return actions.sort((left, right) => {
    return (
      (order.get(left.label) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.label) ?? Number.MAX_SAFE_INTEGER)
    );
  });
};

export const getDeleteFromFolderConfirmationCopy = (options: {
  isLastLink: boolean;
  itemName: string;
}): FilesDeleteFromFolderCopy => {
  if (options.isLastLink) {
    return {
      confirmLabel: 'Delete item from library',
      message:
        `"${options.itemName}" is the last link in Library Files. ` +
        'Deleting it from this folder will also remove the saved item from your rehearsal library.',
      title: 'Delete last link from folder?',
    };
  }

  return {
    confirmLabel: 'Delete from folder',
    message:
      `Only this folder link for "${options.itemName}" will be removed. ` +
      'The saved item will stay in your rehearsal library if other links still exist.',
    title: 'Delete from folder?',
  };
};

export const getTrackRemoveFromLibraryPlacementLabel = () => {
  return 'Track-level Remove from library remains available in the track menu as the final destructive action.';
};
