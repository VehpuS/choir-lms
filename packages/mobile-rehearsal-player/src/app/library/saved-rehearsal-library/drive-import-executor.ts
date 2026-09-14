import type { DriveAudioSource } from '@org/audio-library-models';
import type { PracticeRepository } from '@org/audio-library-runtime';
import type { DriveDiscoveredAudioSource } from '@org/google-drive';

import {
  createCancelledDriveImportOutcome,
  createDriveImportFileLink,
  createDriveImportFolderNode,
  createDriveImportRepositoryWriteQueue,
  createFailedDriveImportOutcome,
  createPendingFolderCancellationOutcomes,
  createPendingTrackCancellationOutcomes,
  createUnsupportedDriveImportOutcomes,
  resolveDriveImportTargetFolderId,
  runDriveImportWithConcurrency,
} from './drive-import-executor-helpers';
import type { DriveImportPlan } from './drive-import-planner';
import {
  createDriveImportCompletionSummary,
  type DriveImportOutcome,
  type DriveImportProgress,
} from './drive-import-status';
import { prepareDriveSourceForPersistence } from './use-saved-rehearsal-library';

const DEFAULT_DRIVE_READ_CONCURRENCY = 4;

type DriveImportRepository = Pick<
  PracticeRepository,
  'saveLibraryFileLink' | 'saveLibraryFolderNode'
> & {
  saveSource(
    ownerId: string,
    source: DriveAudioSource,
    options?: {
      fileLink?: Parameters<PracticeRepository['saveLibraryFileLink']>[1];
    },
  ): Promise<DriveAudioSource[]>;
};

type DriveImportSourceResult = {
  available: boolean;
  outcome?: DriveImportOutcome;
  source?: DriveAudioSource;
};

export type DriveImportExecutionResult = {
  outcomes: DriveImportOutcome[];
  summary: ReturnType<typeof createDriveImportCompletionSummary>;
};

type ExecuteDriveImportPlanOptions = {
  loadDriveSource: (
    source: DriveDiscoveredAudioSource,
    signal?: AbortSignal,
  ) => Promise<DriveDiscoveredAudioSource>;
  maxConcurrentDriveReads?: number;
  now?: () => string;
  onProgress?: (progress: DriveImportProgress) => void;
  ownerId: string;
  plan: DriveImportPlan;
  repository: DriveImportRepository;
  signal?: AbortSignal;
};

export const executeDriveImportPlan = async (
  options: ExecuteDriveImportPlanOptions,
): Promise<DriveImportExecutionResult> => {
  const now = options.now ?? (() => new Date().toISOString());
  const outcomes: DriveImportOutcome[] = createUnsupportedDriveImportOutcomes(
    options.plan.unsupportedSources,
  );
  const folderIdsByDriveId = new Map(
    options.plan.folders.map((intent) => [
      intent.folder.id,
      intent.libraryFolderId,
    ]),
  );
  const unavailableFolderIds = new Set<string>();

  options.onProgress?.({
    completedItems: 0,
    phase: 'creating-folders',
    totalItems: options.plan.folders.length,
  });

  for (const [index, intent] of options.plan.folders.entries()) {
    if (options.signal?.aborted) {
      outcomes.push(
        ...createPendingFolderCancellationOutcomes(
          options.plan.folders.slice(index),
        ),
      );
      break;
    }

    const parentFolderId = resolveDriveImportTargetFolderId(
      intent.parent,
      folderIdsByDriveId,
    );
    const plannedParentUnavailable =
      intent.parent.kind === 'planned-folder' &&
      unavailableFolderIds.has(intent.parent.driveFolderId);

    try {
      if (!parentFolderId || plannedParentUnavailable) {
        throw new Error('The planned parent folder could not be created.');
      }

      if (intent.status === 'create') {
        await options.repository.saveLibraryFolderNode(
          options.ownerId,
          createDriveImportFolderNode(intent, parentFolderId, now()),
        );
      }
      outcomes.push({
        itemId: intent.libraryFolderId,
        itemKind: 'folder',
        itemName: intent.name,
        status: intent.status === 'create' ? 'created' : 'reused',
      });
    } catch (error) {
      unavailableFolderIds.add(intent.folder.id);
      outcomes.push(
        createFailedDriveImportOutcome({
          error,
          itemId: intent.libraryFolderId,
          itemKind: 'folder',
          itemName: intent.name,
        }),
      );
    }

    options.onProgress?.({
      completedItems: index + 1,
      phase: 'creating-folders',
      totalItems: options.plan.folders.length,
    });
  }

  let completedSources = 0;
  const queueRepositoryWrite = createDriveImportRepositoryWriteQueue();
  options.onProgress?.({
    completedItems: 0,
    phase: 'saving-sources',
    totalItems: options.plan.tracks.length,
  });
  const sourceResults = await runDriveImportWithConcurrency({
    concurrency: Math.max(
      1,
      options.maxConcurrentDriveReads ?? DEFAULT_DRIVE_READ_CONCURRENCY,
    ),
    items: options.plan.tracks,
    async run(intent): Promise<DriveImportSourceResult> {
      try {
        const loadedSource = await options.loadDriveSource(
          intent.source,
          options.signal,
        );
        const sourceToSave: DriveAudioSource = {
          ...prepareDriveSourceForPersistence(loadedSource),
          id: intent.canonicalSourceId,
        };
        if (intent.classification !== 'new') {
          await queueRepositoryWrite(() =>
            options.repository.saveSource(options.ownerId, sourceToSave),
          );
        }
        return {
          available: true,
          ...(intent.classification === 'new'
            ? { source: sourceToSave }
            : {
                outcome: {
                  itemId: intent.canonicalSourceId,
                  itemKind: 'source' as const,
                  itemName: intent.source.name,
                  status: 'reused' as const,
                },
              }),
        };
      } catch (error) {
        return {
          available: false,
          outcome: createFailedDriveImportOutcome({
            error,
            itemId: intent.canonicalSourceId,
            itemKind: 'source',
            itemName: intent.source.name,
          }),
        };
      } finally {
        completedSources += 1;
        options.onProgress?.({
          completedItems: completedSources,
          phase: 'saving-sources',
          totalItems: options.plan.tracks.length,
        });
      }
    },
    signal: options.signal,
  });
  for (const [index, result] of sourceResults.entries()) {
    if (result) {
      continue;
    }

    const intent = options.plan.tracks[index];

    if (intent) {
      sourceResults[index] = {
        available: false,
        outcome: createCancelledDriveImportOutcome({
          itemId: intent.canonicalSourceId,
          itemKind: 'source',
          itemName: intent.source.name,
        }),
      };
    }
  }
  outcomes.push(
    ...sourceResults.flatMap((result) =>
      result?.outcome ? [result.outcome] : [],
    ),
  );

  options.onProgress?.({
    completedItems: 0,
    phase: 'linking-tracks',
    totalItems: options.plan.tracks.length,
  });
  for (const [index, intent] of options.plan.tracks.entries()) {
    if (options.signal?.aborted) {
      outcomes.push(
        ...createPendingTrackCancellationOutcomes({
          sourceAvailability: sourceResults
            .slice(index)
            .map((result) => result?.available ?? false),
          tracks: options.plan.tracks.slice(index),
        }),
      );
      break;
    }

    const targetFolderId = resolveDriveImportTargetFolderId(
      intent.targetFolder,
      folderIdsByDriveId,
    );
    const targetUnavailable =
      intent.targetFolder.kind === 'planned-folder' &&
      unavailableFolderIds.has(intent.targetFolder.driveFolderId);

    try {
      if (!sourceResults[index]?.available) {
        throw new Error('The source could not be saved.');
      }
      if (!targetFolderId || targetUnavailable) {
        throw new Error('The target folder could not be created.');
      }

      if (intent.classification === 'new') {
        const source = sourceResults[index]?.source;

        if (!source) {
          throw new Error('The source could not be prepared for saving.');
        }
        await options.repository.saveSource(options.ownerId, source, {
          fileLink: createDriveImportFileLink(intent, targetFolderId),
        });
        outcomes.push({
          itemId: intent.canonicalSourceId,
          itemKind: 'source',
          itemName: intent.source.name,
          status: 'created',
        });
      } else if (intent.classification !== 'already-present') {
        await options.repository.saveLibraryFileLink(
          options.ownerId,
          createDriveImportFileLink(intent, targetFolderId),
        );
      }
      outcomes.push({
        itemId: intent.libraryFileLinkId,
        itemKind: 'link',
        itemName: intent.visibleName ?? intent.source.name,
        status:
          intent.classification === 'already-present'
            ? 'already-present'
            : 'created',
      });
    } catch (error) {
      if (intent.classification === 'new') {
        outcomes.push(
          createFailedDriveImportOutcome({
            error,
            itemId: intent.canonicalSourceId,
            itemKind: 'source',
            itemName: intent.source.name,
          }),
        );
      }
      outcomes.push(
        createFailedDriveImportOutcome({
          error,
          itemId: intent.libraryFileLinkId,
          itemKind: 'link',
          itemName: intent.visibleName ?? intent.source.name,
        }),
      );
    }

    options.onProgress?.({
      completedItems: index + 1,
      phase: 'linking-tracks',
      totalItems: options.plan.tracks.length,
    });
  }

  return {
    outcomes,
    summary: createDriveImportCompletionSummary(outcomes),
  };
};
