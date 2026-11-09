import { MAX_COMPOSITE_RECORD_NAME_LENGTH } from '@org/audio-library-models';

import type { LibraryFilesConfirmationDialogContent } from '../../selection/library-files-confirmation-dialog';
import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';

/**
 * What a composite row's menu offers and says (composite-tracks 7.1): play and
 * queue like any item, rename, and delete, which keeps the stems as tracks.
 * `Add to playlist` and `Keep offline` join in 7.2 and 7.3. Pure; the view and
 * the store sit around it.
 */

export const RENAME_LABEL = 'Rename';
export const DELETE_LABEL = 'Delete composite';
export const RENAME_TITLE = 'Rename composite';
export const RENAME_FIELD_LABEL = 'Composite name';
export const MAX_COMPOSITE_NAME_LENGTH = MAX_COMPOSITE_RECORD_NAME_LENGTH;

export const resolveCompositeRowMenu = (options: {
  isPlayable: boolean;
  /** Something is already playing, so there is a queue to add to. */
  canQueueAsNext: boolean;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onRename: () => void;
  onDelete: () => void;
}): OptionsMenuAction[] => {
  const queueActions: OptionsMenuAction[] =
    options.canQueueAsNext && options.isPlayable
      ? [
          { id: 'play-next', label: 'Play next', onPress: options.onPlayNext },
          {
            id: 'add-to-queue',
            label: 'Add to queue',
            onPress: options.onAddToQueue,
          },
        ]
      : [];

  return [
    ...queueActions,
    { id: 'rename', label: RENAME_LABEL, onPress: options.onRename },
    {
      id: 'delete',
      label: DELETE_LABEL,
      icon: 'trash-can-outline',
      onPress: options.onDelete,
      tone: 'destructive',
    },
  ];
};

/** The delete question: it names the composite and says the stems stay. */
export const buildDeleteCompositeDialog = (composite: {
  name: string;
  stemCount: number;
}): LibraryFilesConfirmationDialogContent => ({
  title: DELETE_LABEL,
  message: `“${composite.name}” will be deleted, with its saved mixes and prepared audio. Its ${composite.stemCount} stems stay in your library as tracks.`,
  confirmLabel: DELETE_LABEL,
});

export type RenameModel = {
  /** What would be saved: the typed text, trimmed. */
  name: string;
  canSave: boolean;
};

/** Saving needs a name that is not blank and not the one it already has. */
export const resolveRenameModel = (
  typed: string,
  currentName: string,
): RenameModel => {
  const name = typed.trim();

  return {
    name,
    canSave:
      name.length > 0 &&
      name.length <= MAX_COMPOSITE_NAME_LENGTH &&
      name !== currentName,
  };
};
