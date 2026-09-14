import type {
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import type { DriveEnumeratedAudioSource } from '@org/google-drive';

import type {
  ClassifiedDriveImportFolderIntent,
  ClassifiedDriveImportTrackIntent,
} from './drive-import-plan-classification';
import type { DriveImportFolderTarget } from './drive-import-planner';
import type { DriveImportOutcome } from './drive-import-status';

export const createUnsupportedDriveImportOutcomes = (
  sources: readonly DriveEnumeratedAudioSource[],
): DriveImportOutcome[] =>
  sources.map((source) => ({
    itemId: source.driveFileId,
    itemKind: 'source',
    itemName: source.name,
    status: 'unsupported',
  }));

export const createCancelledDriveImportOutcome = (options: {
  itemId: string;
  itemKind: DriveImportOutcome['itemKind'];
  itemName: string;
}): DriveImportOutcome => ({
  itemId: options.itemId,
  itemKind: options.itemKind,
  itemName: options.itemName,
  status: 'cancelled',
});

export const createPendingTrackCancellationOutcomes = (options: {
  sourceAvailability: readonly boolean[];
  tracks: readonly ClassifiedDriveImportTrackIntent[];
}): DriveImportOutcome[] =>
  options.tracks.flatMap((intent, index) => [
    ...(intent.classification === 'new' && options.sourceAvailability[index]
      ? [
          createCancelledDriveImportOutcome({
            itemId: intent.canonicalSourceId,
            itemKind: 'source',
            itemName: intent.source.name,
          }),
        ]
      : []),
    createCancelledDriveImportOutcome({
      itemId: intent.libraryFileLinkId,
      itemKind: 'link',
      itemName: intent.visibleName ?? intent.source.name,
    }),
  ]);

export const createPendingFolderCancellationOutcomes = (
  folders: readonly ClassifiedDriveImportFolderIntent[],
): DriveImportOutcome[] =>
  folders.map((intent) =>
    createCancelledDriveImportOutcome({
      itemId: intent.libraryFolderId,
      itemKind: 'folder',
      itemName: intent.name,
    }),
  );

export const createFailedDriveImportOutcome = (options: {
  error: unknown;
  itemId: string;
  itemKind: DriveImportOutcome['itemKind'];
  itemName: string;
}): DriveImportOutcome => ({
  errorMessage:
    options.error instanceof Error && options.error.message.trim()
      ? options.error.message
      : 'The import item could not be completed.',
  itemId: options.itemId,
  itemKind: options.itemKind,
  itemName: options.itemName,
  status: 'failed',
});

export const resolveDriveImportTargetFolderId = (
  target: DriveImportFolderTarget,
  folderIdsByDriveId: ReadonlyMap<string, string>,
) =>
  target.kind === 'library-folder'
    ? target.folderId
    : folderIdsByDriveId.get(target.driveFolderId);

export const runDriveImportWithConcurrency = async <Item, Result>(options: {
  concurrency: number;
  items: readonly Item[];
  run: (item: Item, index: number) => Promise<Result>;
  signal?: AbortSignal;
}) => {
  const results = new Array<Result | undefined>(options.items.length);
  let nextIndex = 0;
  const workerCount = Math.min(options.concurrency, options.items.length);

  const runWorker = async () => {
    while (nextIndex < options.items.length) {
      if (options.signal?.aborted) {
        return;
      }

      const itemIndex = nextIndex;
      nextIndex += 1;
      const item = options.items[itemIndex];

      if (item) {
        results[itemIndex] = await options.run(item, itemIndex);
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
};

export const createDriveImportRepositoryWriteQueue = () => {
  let pendingWrite = Promise.resolve();

  return <Result>(write: () => Promise<Result>) => {
    const result = pendingWrite.then(write);
    pendingWrite = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
};

export const createDriveImportFolderNode = (
  intent: ClassifiedDriveImportFolderIntent,
  parentFolderId: string,
  createdAt: string,
): RehearsalLibraryFolderNode => ({
  createdAt,
  id: intent.libraryFolderId,
  name: intent.name,
  parentFolderId,
});

export const createDriveImportFileLink = (
  intent: ClassifiedDriveImportTrackIntent,
  parentFolderId: string,
): RehearsalLibraryFileLinkNode => ({
  entityId: intent.canonicalSourceId,
  entityKind: 'track',
  id: intent.libraryFileLinkId,
  parentFolderId,
  ...(intent.visibleName ? { visibleName: intent.visibleName } : {}),
});
