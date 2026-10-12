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

type ImportTrackLinkOptions = {
  folderIdsByDriveId: ReadonlyMap<string, string>;
  intent: DriveImportPlan['tracks'][number];
  ownerId: string;
  repository: DriveImportRepository;
  signal?: AbortSignal;
  sourceResult: DriveImportSourceResult | undefined;
  unavailableFolderIds: ReadonlySet<string>;
};

const TRACK_COMPLETED_STATUS = {
  'already-present': 'already-present',
  new: 'created',
  reusable: 'reused',
} as const;

// Links one planned track into its target folder and reports it exactly once:
// the source stage's failure or cancellation, a cancel before this track, the
// link's own failure, or the track's completed status.
const importTrackLink = async (
  options: ImportTrackLinkOptions,
): Promise<DriveImportOutcome> => {
  const { intent, sourceResult } = options;
  const identity = {
    itemId: intent.canonicalSourceId,
    itemKind: 'source' as const,
    itemName: intent.source.name,
  };

  if (sourceResult?.outcome) {
    return sourceResult.outcome;
  }

  if (options.signal?.aborted) {
    return createCancelledDriveImportOutcome(identity);
  }

  const targetFolderId = resolveDriveImportTargetFolderId(
    intent.targetFolder,
    options.folderIdsByDriveId,
  );
  const targetUnavailable =
    intent.targetFolder.kind === 'planned-folder' &&
    options.unavailableFolderIds.has(intent.targetFolder.driveFolderId);

  try {
    if (!sourceResult?.available) {
      throw new Error('The source could not be saved.');
    }
    if (!targetFolderId || targetUnavailable) {
      throw new Error('The target folder could not be created.');
    }

    if (intent.classification === 'new') {
      if (!sourceResult.source) {
        throw new Error('The source could not be prepared for saving.');
      }
      await options.repository.saveSource(
        options.ownerId,
        sourceResult.source,
        {
          fileLink: createDriveImportFileLink(intent, targetFolderId),
        },
      );
    } else if (intent.classification !== 'already-present') {
      await options.repository.saveLibraryFileLink(
        options.ownerId,
        createDriveImportFileLink(intent, targetFolderId),
      );
    }

    return {
      ...identity,
      status: TRACK_COMPLETED_STATUS[intent.classification],
    };
  } catch (error) {
    return createFailedDriveImportOutcome({ error, ...identity });
  }
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
        // A track is reported once, by the link stage below, so a loaded
        // source carries no outcome of its own.
        return {
          available: true,
          ...(intent.classification === 'new' ? { source: sourceToSave } : {}),
        };
      } catch (error) {
        // An abort is the user's cancel, not a failure of the track.
        return {
          available: false,
          outcome: options.signal?.aborted
            ? createCancelledDriveImportOutcome({
                itemId: intent.canonicalSourceId,
                itemKind: 'source',
                itemName: intent.source.name,
              })
            : createFailedDriveImportOutcome({
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
  options.onProgress?.({
    completedItems: 0,
    phase: 'linking-tracks',
    totalItems: options.plan.tracks.length,
  });
  for (const [index, intent] of options.plan.tracks.entries()) {
    // One outcome per track, keyed by its source id (retry planning reads it).
    const trackOutcome = await importTrackLink({
      folderIdsByDriveId,
      intent,
      ownerId: options.ownerId,
      repository: options.repository,
      signal: options.signal,
      sourceResult: sourceResults[index],
      unavailableFolderIds,
    });

    outcomes.push(trackOutcome);
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
