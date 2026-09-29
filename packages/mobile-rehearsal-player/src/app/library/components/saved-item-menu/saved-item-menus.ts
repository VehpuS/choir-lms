import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { resolveSavedLoopRowActions } from '../../loops/utils/saved-loop-row-actions';
import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions';
import type { PendingSourceLocationAction } from '../../saved-rehearsal-library/use-saved-source-original-location-actions';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import {
  composeSavedItemMenu,
  createRemoveFromLibraryAction,
  resolveSavedTrackDriveActions,
  splitSavedItemRowActions,
  type SavedItemMenuAction,
} from './model';

// The row resolvers also return the inline play control, which menus drop.
const MENU_ONLY_PLAYBACK_ACTION = { disabled: true, label: 'Play' };
const noop = () => undefined;

type SavedItemMenuPlacement = {
  idPrefix: string;
  /** The view's own container actions; see `composeSavedItemMenu`. */
  viewActions?: OptionsMenuAction[];
};

export type SavedTrackMenuContext = {
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  canReconnect: boolean;
  isLoopBuilderPreparing: boolean;
  isLoopMutating: boolean;
  isPendingLoopSource: boolean;
  isPendingRemoval: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  loopCount: number;
  onAddToPlaylist: () => void;
  onAddToQueue: () => void;
  onEditTags: () => void;
  onMakeLoop: () => void;
  onOpenInGoogleDrive: () => void;
  onPlayNext: () => void;
  onReconnect: () => void;
  onRemoveFromLibrary: () => void;
  onShowInAdd: () => void;
  onViewTrackLoops: () => void;
  pendingSourceLocationAction: PendingSourceLocationAction | null;
  source: DriveLibrarySource;
};

export const resolveSavedTrackMenu = (
  context: SavedTrackMenuContext,
  placement: SavedItemMenuPlacement,
): OptionsMenuAction[] => {
  const { itemActions, removeAction } = splitSavedItemRowActions(
    resolveSavedTrackRowActions({
      canMutateLibrary: context.canMutateLibrary,
      canMutateLoops: context.canMutateLoops,
      canMutatePlaylists: context.canMutatePlaylists,
      canQueueAsNext: context.canQueueAsNext,
      hasAvailableSource: context.source.availability.status === 'available',
      hasSavedLoops: context.loopCount > 0,
      isLoopBuilderPreparing: context.isLoopBuilderPreparing,
      isLoopMutating: context.isLoopMutating,
      isPendingLoopSource: context.isPendingLoopSource,
      isPendingRemoval: context.isPendingRemoval,
      isPlaylistMutating: context.isPlaylistMutating,
      isSavedLibraryMutating: context.isSavedLibraryMutating,
      onOpenLoopBuilder: context.onMakeLoop,
      onOpenPlaylistSelector: context.onAddToPlaylist,
      onOpenTagEditor: context.onEditTags,
      onQueueNext: context.onPlayNext,
      onQueueUpNext: context.onAddToQueue,
      onRemove: context.onRemoveFromLibrary,
      onTogglePlayback: noop,
      onViewTrackLoops: context.onViewTrackLoops,
      playbackAction: MENU_ONLY_PLAYBACK_ACTION,
      sourceName: context.source.name,
    }),
    placement.idPrefix,
  );
  const driveActions = resolveSavedTrackDriveActions({
    canReconnect: context.canReconnect,
    idPrefix: placement.idPrefix,
    onOpenInGoogleDrive: context.onOpenInGoogleDrive,
    onReconnect: context.onReconnect,
    onShowInAdd: context.onShowInAdd,
    pendingSourceLocationAction: context.pendingSourceLocationAction,
    source: context.source,
  });

  return composeSavedItemMenu({
    itemActions: [...itemActions, ...driveActions],
    kind: 'track',
    removeAction,
    viewActions: placement.viewActions,
  });
};

export type SavedLoopMenuContext = {
  canEditLoop: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  hasPlayableItem: boolean;
  isEditingLoop: boolean;
  isLoopMutating: boolean;
  isPendingRemoval: boolean;
  isPlaylistMutating: boolean;
  loopName: string;
  onAddToPlaylist: () => void;
  onAddToQueue: () => void;
  onEditLoop: () => void;
  onEditTags: () => void;
  onPlayNext: () => void;
  onRemoveFromLibrary: () => void;
};

export const resolveSavedLoopMenu = (
  context: SavedLoopMenuContext,
  placement: SavedItemMenuPlacement,
): OptionsMenuAction[] => {
  const { itemActions, removeAction } = splitSavedItemRowActions(
    resolveSavedLoopRowActions({
      canEditLoop: context.canEditLoop,
      canMutateLoops: context.canMutateLoops,
      canMutatePlaylists: context.canMutatePlaylists,
      canQueueAsNext: context.canQueueAsNext,
      hasPlayableItem: context.hasPlayableItem,
      isEditingLoop: context.isEditingLoop,
      isLoopMutating: context.isLoopMutating,
      isPendingRemoval: context.isPendingRemoval,
      isPlaylistMutating: context.isPlaylistMutating,
      itemName: context.loopName,
      onEdit: context.onEditLoop,
      onEditTags: context.onEditTags,
      onOpenPlaylistSelector: context.onAddToPlaylist,
      onQueueNext: context.onPlayNext,
      onQueueUpNext: context.onAddToQueue,
      onRemove: context.onRemoveFromLibrary,
      onTogglePlayback: noop,
      playbackAction: MENU_ONLY_PLAYBACK_ACTION,
    }),
    placement.idPrefix,
  );

  return composeSavedItemMenu({
    itemActions,
    kind: 'loop',
    removeAction,
    viewActions: placement.viewActions,
  });
};

export type SavedPlaylistMenuContext = {
  /** Also true when playlists cannot be changed right now. */
  isMutating: boolean;
  /** Absent where adding items is not offered for this playlist. */
  onAddItems?: () => void;
  onEditTags: () => void;
  onRemoveFromLibrary: () => void;
};

export const resolveSavedPlaylistMenu = (
  context: SavedPlaylistMenuContext,
  placement: SavedItemMenuPlacement,
): OptionsMenuAction[] => {
  const itemActions: SavedItemMenuAction[] = [
    ...(context.onAddItems
      ? [
          {
            disabled: context.isMutating,
            id: `${placement.idPrefix}:add-items`,
            label: 'Add items',
            onPress: context.onAddItems,
            tone: 'secondary' as const,
          },
        ]
      : []),
    {
      disabled: context.isMutating,
      id: `${placement.idPrefix}:edit-tags`,
      label: 'Edit tags',
      onPress: context.onEditTags,
      tone: 'secondary',
    },
  ];

  return composeSavedItemMenu({
    itemActions,
    kind: 'playlist',
    removeAction: createRemoveFromLibraryAction({
      disabled: context.isMutating,
      id: `${placement.idPrefix}:remove-from-library`,
      onPress: context.onRemoveFromLibrary,
    }),
    viewActions: placement.viewActions,
  });
};
