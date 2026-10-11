import type {
  PlacementItem,
  PlacementMode,
  PlacementPlanEntry,
  PlacementResolution,
} from '@org/audio-library-runtime';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import {} from '../../saved-rehearsal-library/files-bulk-node-plans';
import {
  toPlacementItems,
  type FilesSelectionItem,
} from '../../saved-rehearsal-library/files-selection';
import { type BulkOperationResult } from '../../saved-rehearsal-library/library-files-bulk-operations';
import type { LibraryFilesIssue } from '../../saved-rehearsal-library/library-files-operation-helpers';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { BulkActionHandlers } from '../../selection/bulk-action-assembly';
import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';
import { useLibrarySelectionServices } from '../../selection/library-selection-services';
import { OptionsMenuSheet } from '../options-menu-sheet';
import { getBulkPlacementAcknowledgment } from './files-bulk-copy';
import { buildBulkDestinationPicker } from './files-bulk-destination-picker';
import { FilesBulkPlacementReview } from './files-bulk-placement-review';
import { FeedbackCard } from '../feedback-card';
import { useLibraryFilesBulkRemovalActions } from './use-library-files-bulk-removal-actions';

type PlacementState = {
  /** Set once the destination is chosen and the plan needs a decision. */
  review: {
    destinationFolderId: string;
    entries: PlacementPlanEntry[];
    resolutions: Record<string, PlacementResolution>;
  } | null;
  mode: PlacementMode;
  pickerFolderId: string | null;
};

type UseLibraryFilesBulkNodeActionsOptions = {
  files: UseLibraryFilesResult;
  /**
   * The nodes a copy or move acts on. Files reads them from the tree; the
   * views without folder links supply synthetic ones (see `entity-selection`).
   */
  getPlacementItems?: () => PlacementItem[];
  /** The selection in display order. */
  items: readonly FilesSelectionItem[];
  /** Called once an action finished, so the view can leave selection mode. */
  onCompleted: () => void;
};

const UNDO_LABEL = 'Undo';

/**
 * The Files bulk actions that act on the selected nodes themselves (design
 * Decision 10): copy and move through one destination picker and one conflict
 * list, `Delete from folder` and `Remove from library` through one aggregated
 * confirmation each. Persistence goes through `files.bulk`, one write per
 * action; copy and move acknowledge with an `Undo`.
 */
export const useLibraryFilesBulkNodeActions = ({
  files,
  getPlacementItems,
  items,
  onCompleted,
}: UseLibraryFilesBulkNodeActionsOptions) => {
  const services = useLibrarySelectionServices();
  const [placement, setPlacement] = useState<PlacementState | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [issue, setIssue] = useState<LibraryFilesIssue | null>(null);
  const { tree } = files;

  const closePlacement = useCallback(() => {
    setPlacement(null);
    setIssue(null);
  }, []);

  const acknowledgeUndo = useCallback(
    (result: BulkOperationResult): BulkAcknowledgment =>
      result.didComplete
        ? { message: 'The change was reversed.', title: 'Undone' }
        : {
            message:
              result.issue?.message ?? 'Some items may not have been changed.',
            title: result.issue?.title ?? 'Could not undo',
          },
    [],
  );

  const applyPlacement = useCallback(
    async (options: {
      destinationFolderId: string;
      entries: PlacementPlanEntry[];
      mode: PlacementMode;
      resolutions: Record<string, PlacementResolution>;
    }) => {
      setIsMutating(true);
      const result = await files.bulk.applyPlacement({
        destinationFolderId: options.destinationFolderId,
        mode: options.mode,
        plan: options.entries,
        resolutions: options.resolutions,
      });

      setIsMutating(false);

      if (!result.didComplete) {
        setIssue(result.issue);
        return;
      }

      const destination = files.destinationFolders.find(
        ({ folder }) => folder.id === options.destinationFolderId,
      );
      const { placed } = result;

      closePlacement();
      services.acknowledge({
        ...getBulkPlacementAcknowledgment({
          destinationName: destination?.folder.name ?? 'the folder',
          mode: options.mode,
          placedCount: result.placedCount,
          skippedCount: result.skippedCount,
        }),
        // The view already shows the destination when it is the current folder.
        action:
          options.destinationFolderId === files.explorer?.currentFolder.id
            ? undefined
            : {
                folderId: options.destinationFolderId,
                label: `Open ${destination?.folder.name ?? 'folder'}`,
              },
        undo:
          placed && result.placedCount > 0
            ? {
                label: UNDO_LABEL,
                run: async () => {
                  services.acknowledge(
                    acknowledgeUndo(await files.bulk.undoPlacement(placed)),
                  );
                },
              }
            : undefined,
      });
      onCompleted();
    },
    [acknowledgeUndo, closePlacement, files, onCompleted, services],
  );

  const submitDestination = useCallback(
    (destinationFolderId: string) => {
      if (!placement || !tree) {
        return;
      }

      const placementItems =
        getPlacementItems?.() ?? toPlacementItems(items, tree).placementItems;
      const entries = files.bulk.planPlacement({
        destinationFolderId,
        items: placementItems,
        mode: placement.mode,
      });

      // Nothing to decide: place straight away rather than ask an empty question.
      if (entries.every(({ status }) => status === 'ready')) {
        void applyPlacement({
          destinationFolderId,
          entries,
          mode: placement.mode,
          resolutions: {},
        });
        return;
      }

      setIssue(null);
      setPlacement({
        ...placement,
        review: {
          destinationFolderId,
          entries,
          // Keeping both loses nothing, so it is the starting choice.
          resolutions: Object.fromEntries(
            entries
              .filter(({ status }) => status === 'conflict')
              .map(({ itemId }) => [itemId, 'keep-both' as const]),
          ),
        },
      });
    },
    [applyPlacement, files.bulk, getPlacementItems, items, placement, tree],
  );

  const startPlacement = useCallback(
    (mode: PlacementMode) => {
      setIssue(null);
      setPlacement({
        mode,
        pickerFolderId: files.explorer?.currentFolder.id ?? null,
        review: null,
      });
    },
    [files.explorer],
  );

  const removal = useLibraryFilesBulkRemovalActions({
    files,
    items,
    onCompleted,
  });

  const handlers = useMemo<BulkActionHandlers>(
    () => ({
      'copy-to-folder': () => {
        startPlacement('copy');
      },
      'delete-from-folder': removal.deleteFromFolder,
      'move-to-folder': () => {
        startPlacement('move');
      },
      'remove-from-library': removal.removeFromLibrary,
    }),
    [removal.deleteFromFolder, removal.removeFromLibrary, startPlacement],
  );

  const picker = placement
    ? buildBulkDestinationPicker({
        currentFilesFolderId: files.explorer?.currentFolder.id ?? null,
        destinationFolders: files.destinationFolders,
        isMutating,
        mode: placement.mode,
        onOpenFolder: (folderId) => {
          setIssue(null);
          setPlacement({ ...placement, pickerFolderId: folderId });
        },
        onSelectFolder: submitDestination,
        pickerFolderId: placement.pickerFolderId,
        selectedFolderIds: new Set(
          items.flatMap((item) =>
            item.kind === 'folder' ? [item.folderId] : [],
          ),
        ),
      })
    : null;
  const review = placement?.review ?? null;
  const reviewDestinationName =
    files.destinationFolders.find(
      ({ folder }) => folder.id === review?.destinationFolderId,
    )?.folder.name ?? 'the folder';
  const nodes: ReactNode = (
    <>
      {picker && placement && !review ? (
        <OptionsMenuSheet
          actions={picker.actions}
          isSecondaryDisabled={isMutating}
          isVisible
          onClose={closePlacement}
          secondaryActionLabel="Cancel"
          title={picker.title}
        >
          {issue ? (
            <FeedbackCard
              message={issue.message}
              size="compact"
              title={issue.title}
              tone="error"
            />
          ) : null}
        </OptionsMenuSheet>
      ) : null}
      {placement && review ? (
        <FilesBulkPlacementReview
          destinationName={reviewDestinationName}
          entries={review.entries}
          isMutating={isMutating}
          issue={issue}
          mode={placement.mode}
          onCancel={closePlacement}
          onConfirm={() => {
            void applyPlacement({
              destinationFolderId: review.destinationFolderId,
              entries: review.entries,
              mode: placement.mode,
              resolutions: review.resolutions,
            });
          }}
          onResolve={(itemId, resolution) => {
            setPlacement({
              ...placement,
              review: {
                ...review,
                resolutions: { ...review.resolutions, [itemId]: resolution },
              },
            });
          }}
          resolutions={review.resolutions}
        />
      ) : null}
      {removal.confirmationDialog}
    </>
  );

  return { handlers, nodes };
};
