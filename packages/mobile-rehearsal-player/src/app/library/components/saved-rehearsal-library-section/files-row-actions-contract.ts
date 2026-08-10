import type { OptionsMenuAction } from '../options-menu-sheet/model';

export type FilesDeleteFromFolderCopy = {
  confirmLabel: string;
  message: string;
  title: string;
};

export const TRACK_ACTION_LABELS = new Set([
  'Play next',
  'Add to queue',
  'Add to playlist',
  'Make loop',
  'Reconnect',
  'Create a copy',
  'Edit tags',
  'Rename',
  'Move to folder',
  'Delete from folder',
  'Remove from library',
]);

export const TRACK_ACTION_ORDER = new Map([
  ['Play next', 0],
  ['Add to queue', 1],
  ['Make loop', 2],
  ['Add to playlist', 3],
  ['Reconnect', 4],
  ['Create a copy', 5],
  ['Edit tags', 6],
  ['Rename', 7],
  ['Move to folder', 8],
  ['Delete from folder', 9],
  ['Remove from library', 10],
]);

export const LOOP_ACTION_LABELS = new Set([
  'Play next',
  'Add to queue',
  'Add to playlist',
  'Edit loop',
  'Create a copy',
  'Edit tags',
  'Rename',
  'Move to folder',
  'Delete from folder',
]);

export const LOOP_ACTION_ORDER = new Map([
  ['Play next', 0],
  ['Add to queue', 1],
  ['Add to playlist', 2],
  ['Edit loop', 3],
  ['Create a copy', 4],
  ['Edit tags', 5],
  ['Rename', 6],
  ['Move to folder', 7],
  ['Delete from folder', 8],
]);

export const PLAYLIST_ACTION_ORDER = new Map([
  ['Add items', 0],
  ['Create a copy', 1],
  ['Edit tags', 2],
  ['Rename', 3],
  ['Move to folder', 4],
  ['Delete from folder', 5],
]);

export const FOLDER_ACTION_ORDER = new Map([
  ['Edit tags', 0],
  ['Rename', 1],
  ['Move to folder', 2],
  ['Delete from folder', 3],
]);

export const DISABLED_PLACEHOLDER_ACTIONS = {
  createCopy: {
    disabled: true,
    label: 'Create a copy',
    onPress: () => undefined,
  },
  deleteFromFolder: {
    disabled: true,
    label: 'Delete from folder',
    onPress: () => undefined,
    tone: 'destructive' as const,
  },
  moveToFolder: {
    disabled: true,
    label: 'Move to folder',
    onPress: () => undefined,
  },
  removeFromLibrary: {
    disabled: true,
    label: 'Remove from library',
    onPress: () => undefined,
    tone: 'destructive' as const,
  },
  rename: {
    disabled: true,
    label: 'Rename',
    onPress: () => undefined,
  },
};

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

export const sortActionsByLabelOrder = (
  actions: OptionsMenuAction[],
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
