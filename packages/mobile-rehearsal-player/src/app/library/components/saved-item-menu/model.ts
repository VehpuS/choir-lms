import { omit } from 'es-toolkit';

import type { DriveLibrarySourceAction } from '../../drive/utils/drive-library-source-actions';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { getOriginalDriveLocationViewModel } from '../../saved-rehearsal-library/original-drive-location-view-model';
import type { PendingSourceLocationAction } from '../../saved-rehearsal-library/use-saved-source-original-location-actions';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import { attachRowActionSections } from '../options-menu-sheet/row-action-sections';

/**
 * One overflow menu per saved item kind (task 2.12): every Library view
 * builds a track's, loop's, or playlist's menu here, so the item's own
 * actions, labels, order, and sections match everywhere. A view contributes
 * only actions on its own container (Files' link actions, `Rename playlist`
 * outside Files), placed after the item actions and before removal.
 */
export type SavedItemMenuKind = 'loop' | 'playlist' | 'track';

/** An item action; `slot` names its canonical position when its label is a
 * pending state shared by two actions (`Checking Drive…`). */
export type SavedItemMenuAction = OptionsMenuAction & { slot?: string };

export const REMOVE_FROM_LIBRARY_LABEL = 'Remove from library';
export const CHECKING_DRIVE_LABEL = 'Checking Drive…';
const REMOVING_LABEL = 'Removing…';
const RESOLVER_REMOVE_LABELS = new Set(['Remove', REMOVING_LABEL]);

const SHOW_IN_ADD_LABEL = 'Show in Add';
const OPEN_IN_GOOGLE_DRIVE_LABEL = 'Open in Google Drive';
const RECONNECT_LABEL = 'Reconnect';

export const SAVED_ITEM_ACTION_ORDER: Record<
  SavedItemMenuKind,
  readonly string[]
> = {
  loop: ['Play next', 'Add to queue', 'Add to playlist', 'Edit loop', 'Edit tags'],
  playlist: ['Add items', 'Edit tags'],
  track: [
    'Play next',
    'Add to queue',
    'Make loop',
    'View track loops',
    'Add to playlist',
    RECONNECT_LABEL,
    SHOW_IN_ADD_LABEL,
    OPEN_IN_GOOGLE_DRIVE_LABEL,
    'Edit tags',
  ],
};

// Transient labels that stand in for an action while it is busy or blocked.
const PENDING_LABEL_SLOTS = new Map([
  ['Editing…', 'Edit loop'],
  ['Playlists unavailable', 'Add to playlist'],
  ['Preparing loop…', 'Make loop'],
  ['Updating playlist…', 'Add to playlist'],
]);

const resolveSlotIndex = (kind: SavedItemMenuKind, action: SavedItemMenuAction) => {
  const order = SAVED_ITEM_ACTION_ORDER[kind];
  const slot = action.slot ?? PENDING_LABEL_SLOTS.get(action.label) ?? action.label;
  const index = order.indexOf(slot);

  // An action the order does not know sorts after the known ones rather
  // than disappearing, so a new resolver action stays visible.
  return index === -1 ? order.length : index;
};

const stripSlot = (action: SavedItemMenuAction): OptionsMenuAction => {
  return omit(action, ['slot']);
};

export const composeSavedItemMenu = (options: {
  itemActions: SavedItemMenuAction[];
  kind: SavedItemMenuKind;
  removeAction?: OptionsMenuAction | null;
  viewActions?: OptionsMenuAction[];
}): OptionsMenuAction[] => {
  const orderedItemActions = options.itemActions
    .map((action, index) => {
      return {
        action,
        index,
        slotIndex: resolveSlotIndex(options.kind, action),
      };
    })
    .sort((left, right) => {
      return left.slotIndex - right.slotIndex || left.index - right.index;
    })
    .map(({ action }) => stripSlot(action));
  const viewActions = options.viewActions ?? [];
  const viewNonDestructive = viewActions.filter((action) => {
    return action.tone !== 'destructive';
  });
  const viewDestructive = viewActions.filter((action) => {
    return action.tone === 'destructive';
  });

  return attachRowActionSections([
    ...orderedItemActions,
    ...viewNonDestructive,
    ...viewDestructive,
    ...(options.removeAction ? [options.removeAction] : []),
  ]);
};

export const createRemoveFromLibraryAction = (options: {
  disabled: boolean;
  id: string;
  isPending?: boolean;
  onPress: () => void;
}): OptionsMenuAction => {
  return {
    disabled: options.disabled,
    id: options.id,
    label: options.isPending ? REMOVING_LABEL : REMOVE_FROM_LIBRARY_LABEL,
    onPress: options.onPress,
    tone: 'destructive',
  };
};

/**
 * Splits a track or loop row resolver's output into menu item actions and
 * the removal action, relabelled `Remove from library` (it was `Remove`).
 */
export const splitSavedItemRowActions = (
  rowActions: DriveLibrarySourceAction[],
  idPrefix: string,
): {
  itemActions: SavedItemMenuAction[];
  removeAction: OptionsMenuAction | null;
} => {
  const menuActions = rowActions.filter((action) => {
    return action.placement === 'menu';
  });
  const resolverRemove = menuActions.find((action) => {
    return RESOLVER_REMOVE_LABELS.has(action.label);
  });

  return {
    itemActions: menuActions
      .filter((action) => !RESOLVER_REMOVE_LABELS.has(action.label))
      .map((action) => {
        return {
          disabled: action.disabled,
          id: `${idPrefix}:${action.label}`,
          label: action.label,
          onPress: action.onPress,
          tone: 'secondary' as const,
        };
      }),
    removeAction: resolverRemove
      ? createRemoveFromLibraryAction({
          disabled: Boolean(resolverRemove.disabled),
          id: `${idPrefix}:remove-from-library`,
          isPending: resolverRemove.label === REMOVING_LABEL,
          onPress: resolverRemove.onPress,
        })
      : null,
  };
};

/**
 * `Reconnect` (unavailable tracks only), `Show in Add`, and `Open in Google
 * Drive`, with the shared `Checking Drive…` pending label while a lookup for
 * this track is in flight.
 */
export const resolveSavedTrackDriveActions = (options: {
  canReconnect: boolean;
  idPrefix: string;
  onOpenInGoogleDrive: () => void;
  onReconnect: () => void;
  onShowInAdd: () => void;
  pendingSourceLocationAction: PendingSourceLocationAction | null;
  source: DriveLibrarySource;
}): SavedItemMenuAction[] => {
  const originalLocation = getOriginalDriveLocationViewModel(options.source);
  const pending = options.pendingSourceLocationAction;
  const isPending = pending?.sourceId === options.source.id;
  const actions: SavedItemMenuAction[] = [];

  if (options.source.availability.status !== 'available') {
    actions.push({
      disabled: !options.canReconnect,
      id: `${options.idPrefix}:reconnect`,
      label: RECONNECT_LABEL,
      onPress: options.onReconnect,
      tone: 'secondary',
    });
  }

  if (originalLocation.canShowInAdd) {
    actions.push({
      disabled: isPending,
      id: `${options.idPrefix}:show-in-add`,
      label:
        isPending && pending?.kind === 'show-in-add'
          ? CHECKING_DRIVE_LABEL
          : SHOW_IN_ADD_LABEL,
      onPress: options.onShowInAdd,
      slot: SHOW_IN_ADD_LABEL,
      tone: 'secondary',
    });
  }

  if (originalLocation.canOpenInGoogleDrive) {
    actions.push({
      disabled: isPending,
      id: `${options.idPrefix}:open-in-google-drive`,
      label:
        isPending && pending?.kind === 'open-in-google-drive'
          ? CHECKING_DRIVE_LABEL
          : OPEN_IN_GOOGLE_DRIVE_LABEL,
      onPress: options.onOpenInGoogleDrive,
      slot: OPEN_IN_GOOGLE_DRIVE_LABEL,
      tone: 'secondary',
    });
  }

  return actions;
};
