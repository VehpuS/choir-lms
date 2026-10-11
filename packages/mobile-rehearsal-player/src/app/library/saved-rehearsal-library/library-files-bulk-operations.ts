import type {
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import {
  AsyncStoragePracticeRepository,
  buildPlacementNodes,
  planRehearsalLibraryPlacement,
  type PlacementItem,
  type PlacementMode,
  type PlacementPlanEntry,
  type PlacementResolution,
} from '@org/audio-library-runtime';
import type { Dispatch, SetStateAction } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import {
  createLibraryFilesIssue,
  createUniqueNodeId,
  type LibraryFilesEntityRefreshCallbacks,
  type LibraryFilesIssue,
  type UseLibraryFilesOptions,
} from './library-files-operation-helpers';

// Batched variants of the single-item library operations (design Decision 10).
// They apply the single-item rules to many items in one pass and persist once,
// through the runtime repository's batch methods.

type LibraryFilesBulkOperationsOptions = {
  options: UseLibraryFilesOptions & LibraryFilesEntityRefreshCallbacks;
  practiceRepository: AsyncStoragePracticeRepository;
  setIssue: Dispatch<SetStateAction<LibraryFilesIssue | null>>;
  setTree: Dispatch<SetStateAction<RehearsalLibraryFileTree | null>>;
  tree: RehearsalLibraryFileTree | null;
};

export type BulkOperationResult = {
  didComplete: boolean;
  issue: LibraryFilesIssue | null;
  /** How many selected items the action changed. */
  placedCount: number;
  /** The tree before the action, for the completion acknowledgment's undo. */
  previousTree: RehearsalLibraryFileTree | null;
  /** Items left out: invalid targets and conflicts the user chose to skip. */
  skippedCount: number;
};

export type BulkRemoveFromLibraryImpact = {
  adjustedTrackCount: number;
  adjustedTrackNames: string[];
  fileLinkCount: number;
  fileLinkNames: string[];
  loopCount: number;
  loopNames: string[];
  playlistEntryCount: number;
  playlistEntryTitles: string[];
};

type TrackRemoveImpactReader = (
  sourceId: string,
) => BulkRemoveFromLibraryImpact;

/**
 * Sums single-track removal impacts across a selection. An adjusted track
 * selected together with its source is already inside that source's impact,
 * so it is not counted twice; names that several tracks share are listed once.
 */
export const aggregateTrackRemoveImpacts = (options: {
  getImpact: TrackRemoveImpactReader;
  savedSources: UseLibraryFilesOptions['savedSources'];
  sourceIds: readonly string[];
}): BulkRemoveFromLibraryImpact => {
  const selectedIds = new Set(options.sourceIds);
  const independentIds = options.sourceIds.filter((sourceId) => {
    const sourceRef = options.savedSources.find(({ id }) => id === sourceId)
      ?.adjustment?.sourceRef;

    return !sourceRef || !selectedIds.has(sourceRef);
  });
  const impacts = independentIds.map(options.getImpact);
  const union = (pick: (impact: BulkRemoveFromLibraryImpact) => string[]) => [
    ...new Set(impacts.flatMap(pick)),
  ];
  const adjustedTrackNames = union((impact) => impact.adjustedTrackNames);
  const fileLinkNames = union((impact) => impact.fileLinkNames);
  const loopNames = union((impact) => impact.loopNames);
  const playlistEntryTitles = union((impact) => impact.playlistEntryTitles);

  return {
    adjustedTrackCount: adjustedTrackNames.length,
    adjustedTrackNames,
    fileLinkCount: fileLinkNames.length,
    fileLinkNames,
    loopCount: loopNames.length,
    loopNames,
    playlistEntryCount: playlistEntryTitles.length,
    playlistEntryTitles,
  };
};

export const createLibraryFilesBulkOperations = ({
  options,
  practiceRepository,
  setIssue,
  setTree,
  tree,
}: LibraryFilesBulkOperationsOptions) => {
  const entityCollections = {
    loops: options.savedLoops,
    playlists: options.savedPlaylists,
    sources: options.savedSources,
  };

  const refreshAllEntities = async () => {
    await Promise.all([
      options.refreshSavedSources(),
      options.refreshSavedLoops(),
      options.refreshSavedPlaylists(),
    ]);
  };

  const fail = (
    title: string,
    message: string,
    error: unknown,
  ): BulkOperationResult => {
    const issue = createLibraryFilesIssue({
      error,
      fallbackMessage: message,
      fallbackTitle: title,
    });

    setIssue(issue);
    return {
      didComplete: false,
      issue,
      placedCount: 0,
      previousTree: tree,
      skippedCount: 0,
    };
  };

  const succeed = (
    nextTree: RehearsalLibraryFileTree,
    placedCount: number,
    skippedCount = 0,
  ): BulkOperationResult => {
    setTree(nextTree);
    setIssue(null);
    return {
      didComplete: true,
      issue: null,
      placedCount,
      previousTree: tree,
      skippedCount,
    };
  };

  return {
    /** Finds every conflict and invalid target for a copy / move in one pass. */
    planPlacement(placement: {
      destinationFolderId: string;
      items: readonly PlacementItem[];
      mode: PlacementMode;
    }): PlacementPlanEntry[] {
      return tree
        ? planRehearsalLibraryPlacement({
            ...placement,
            entityCollections,
            tree,
          })
        : [];
    },
    async applyPlacement(placement: {
      destinationFolderId: string;
      mode: PlacementMode;
      plan: readonly PlacementPlanEntry[];
      resolutions: Readonly<Record<string, PlacementResolution>>;
    }): Promise<BulkOperationResult> {
      const nodes = buildPlacementNodes({
        ...placement,
        createLinkId: ({ entityId, entityKind }) =>
          createUniqueNodeId(`file-link:${entityKind}:${entityId}:copy`),
      });
      const placedCount = nodes.fileLinks.length + nodes.folders.length;

      if (placedCount === 0) {
        return {
          didComplete: true,
          issue: null,
          placedCount: 0,
          previousTree: tree,
          skippedCount: nodes.skippedCount,
        };
      }

      try {
        return succeed(
          await practiceRepository.saveLibraryNodes(
            LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
            nodes,
          ),
          placedCount,
          nodes.skippedCount,
        );
      } catch (error) {
        return fail(
          placement.mode === 'copy'
            ? 'Could not copy items'
            : 'Could not move items',
          'Nothing was changed.',
          error,
        );
      }
    },
    /** `Delete from folder` over links: how many are the last link of their item. */
    getBulkDeleteFromFolderImpact(fileLinkIds: readonly string[]) {
      const removed = new Set(fileLinkIds);
      const remainingKeys = new Set(
        (tree?.fileLinks ?? [])
          .filter((fileLink) => !removed.has(fileLink.id))
          .map((fileLink) => `${fileLink.entityKind}:${fileLink.entityId}`),
      );
      const removedLinks = (tree?.fileLinks ?? []).filter((fileLink) => {
        return removed.has(fileLink.id);
      });
      // One entry per item that loses its last link, however many of its
      // links are in the selection.
      const lastLinks = [
        ...new Map(
          removedLinks
            .filter((fileLink) => {
              return !remainingKeys.has(
                `${fileLink.entityKind}:${fileLink.entityId}`,
              );
            })
            .map((fileLink) => [
              `${fileLink.entityKind}:${fileLink.entityId}`,
              fileLink,
            ]),
        ).values(),
      ];
      const countOf = (kind: RehearsalLibraryEntityKind) => {
        return lastLinks.filter(({ entityKind }) => entityKind === kind).length;
      };

      return {
        lastLinkCount: lastLinks.length,
        lastLinkLoopCount: countOf('loop'),
        lastLinkPlaylistCount: countOf('playlist'),
        lastLinkTrackCount: countOf('track'),
        linkCount: removedLinks.length,
      };
    },
    async deleteFileLinks(fileLinkIds: readonly string[]) {
      try {
        const { tree: nextTree } =
          await practiceRepository.removeLibraryFileLinks(
            LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
            [...fileLinkIds],
          );
        const result = succeed(nextTree, fileLinkIds.length);

        await refreshAllEntities();
        return result;
      } catch (error) {
        return fail(
          'Could not delete from folder',
          'Nothing was changed.',
          error,
        );
      }
    },
    async removeFromLibrary(entities: {
      loopIds?: readonly string[];
      playlistIds?: readonly string[];
      sourceIds?: readonly string[];
    }) {
      try {
        const { tree: nextTree } =
          await practiceRepository.removeLibraryEntities(
            LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
            entities,
          );
        const result = succeed(
          nextTree,
          (entities.sourceIds?.length ?? 0) +
            (entities.loopIds?.length ?? 0) +
            (entities.playlistIds?.length ?? 0),
        );

        await refreshAllEntities();
        return result;
      } catch (error) {
        return fail(
          'Could not remove from library',
          'Nothing was changed.',
          error,
        );
      }
    },
    async removePlaylistEntries(playlistId: string, entryIds: string[]) {
      try {
        await practiceRepository.removePlaylistEntries(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          playlistId,
          entryIds,
        );
        setIssue(null);
        await options.refreshSavedPlaylists();
        return true;
      } catch (error) {
        fail('Could not remove from playlist', 'Nothing was changed.', error);
        return false;
      }
    },
    async updateTags(
      change: Parameters<
        AsyncStoragePracticeRepository['updateLibraryTags']
      >[1],
    ) {
      try {
        const nextTree = await practiceRepository.updateLibraryTags(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          change,
        );
        const result = succeed(nextTree, change.targets.length);

        await refreshAllEntities();
        return result;
      } catch (error) {
        return fail('Could not update tags', 'Nothing was changed.', error);
      }
    },
  };
};
