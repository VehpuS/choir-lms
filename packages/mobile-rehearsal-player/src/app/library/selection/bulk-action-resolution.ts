import type { BulkSelectionItem } from './playback-expansion';

export type BulkSurface =
  | 'files'
  | 'library-search'
  | 'loops'
  | 'playlist-detail'
  | 'playlists'
  | 'tag-detail'
  | 'tracks';

export type BulkActionId =
  | 'add-to-playlist'
  | 'add-to-queue'
  | 'copy-to-folder'
  | 'delete-from-folder'
  | 'edit-tags'
  | 'move-to-folder'
  | 'play-next'
  | 'remove-from-library'
  | 'remove-from-playlist'
  | 'save-as-playlist';

export const BULK_ACTION_LABELS: Record<BulkActionId, string> = {
  'add-to-playlist': 'Add to playlist',
  'add-to-queue': 'Add to queue',
  'copy-to-folder': 'Copy to folder',
  'delete-from-folder': 'Delete from folder',
  'edit-tags': 'Edit tags',
  'move-to-folder': 'Move to folder',
  'play-next': 'Play next',
  'remove-from-library': 'Remove from library',
  'remove-from-playlist': 'Remove from playlist',
  'save-as-playlist': 'Save as playlist',
};

export type ResolvedBulkAction = {
  disabledReason?: string;
  /** Selected folders an action leaves out (copy, remove from library). */
  excludedFolderCount: number;
  id: BulkActionId;
  isDisabled: boolean;
  label: string;
  tone: 'destructive' | 'neutral';
};

type ResolveBulkActionsOptions = {
  /** Effective item count from `expandSelectionForPlayback`. */
  effectivePlayableCount: number;
  items: readonly BulkSelectionItem[];
  surface: BulkSurface;
};

// Display order: the three always-visible actions first (design Decision 9),
// then the rest of the spec's list. Move / Delete appear on Files only and
// Remove from playlist on playlist detail only.
const PLAYBACK_AND_PLAYLIST_ACTIONS: readonly BulkActionId[] = [
  'play-next',
  'add-to-queue',
  'add-to-playlist',
  'save-as-playlist',
];
const ENTITY_ACTIONS: readonly BulkActionId[] = [
  ...PLAYBACK_AND_PLAYLIST_ACTIONS,
  'edit-tags',
  'copy-to-folder',
  'remove-from-library',
];

const SURFACE_ACTIONS: Record<BulkSurface, readonly BulkActionId[]> = {
  files: [
    ...PLAYBACK_AND_PLAYLIST_ACTIONS,
    'edit-tags',
    'copy-to-folder',
    'move-to-folder',
    'delete-from-folder',
    'remove-from-library',
  ],
  'library-search': ENTITY_ACTIONS,
  loops: ENTITY_ACTIONS,
  // Selected rows here are entries, not library entities, so the actions that
  // act on entities (tags, copy, remove from library) are not offered.
  'playlist-detail': [...PLAYBACK_AND_PLAYLIST_ACTIONS, 'remove-from-playlist'],
  playlists: ENTITY_ACTIONS,
  'tag-detail': ENTITY_ACTIONS,
  tracks: ENTITY_ACTIONS,
};

const PLAYBACK_ACTIONS: ReadonlySet<BulkActionId> = new Set(
  PLAYBACK_AND_PLAYLIST_ACTIONS,
);
const DESTRUCTIVE_ACTIONS: ReadonlySet<BulkActionId> = new Set([
  'delete-from-folder',
  'remove-from-library',
  'remove-from-playlist',
]);

const NOTHING_SELECTED_REASON = 'Nothing is selected.';
const NOTHING_PLAYABLE_REASON =
  'This selection has no tracks or loops to play.';

type DisabledCheck = { excludedFolderCount: number; reason: string | null };

const countFolders = (items: readonly BulkSelectionItem[]) =>
  items.filter((item) => item.kind === 'folder').length;

const getDisabledCheck = (
  id: BulkActionId,
  options: ResolveBulkActionsOptions,
): DisabledCheck => {
  const folderCount = countFolders(options.items);

  if (options.items.length === 0) {
    return { excludedFolderCount: 0, reason: NOTHING_SELECTED_REASON };
  }

  if (PLAYBACK_ACTIONS.has(id)) {
    return {
      excludedFolderCount: 0,
      reason:
        options.effectivePlayableCount === 0 ? NOTHING_PLAYABLE_REASON : null,
    };
  }

  // Neither operation exists for folders today (design Decision 10).
  if (id === 'copy-to-folder' || id === 'remove-from-library') {
    const onlyFolders = folderCount === options.items.length;
    const folderHint =
      id === 'remove-from-library' && options.surface === 'files'
        ? 'Folders can only be removed with Delete from folder.'
        : id === 'copy-to-folder'
          ? 'Folders cannot be copied.'
          : 'Folders cannot be removed from the library.';

    return {
      excludedFolderCount: folderCount,
      reason: onlyFolders ? folderHint : null,
    };
  }

  return { excludedFolderCount: 0, reason: null };
};

/**
 * The bulk actions a surface offers for the current selection, in display
 * order, each with whether it can run now and why not. Pure data: handlers are
 * attached by the surface, so the rules can be tested without UI.
 */
export const resolveBulkActions = (
  options: ResolveBulkActionsOptions,
): ResolvedBulkAction[] =>
  SURFACE_ACTIONS[options.surface].map((id) => {
    const { excludedFolderCount, reason } = getDisabledCheck(id, options);

    return {
      ...(reason === null ? {} : { disabledReason: reason }),
      excludedFolderCount,
      id,
      isDisabled: reason !== null,
      label: BULK_ACTION_LABELS[id],
      tone: DESTRUCTIVE_ACTIONS.has(id) ? 'destructive' : 'neutral',
    };
  });
