import type { DriveAudioSource, NamedLoop } from '@org/audio-library-models';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import {
  getOfflineBatchRunner,
  uniqueSourcesByFile,
  type OfflineBatchResult,
} from '../offline/offline-batch';
import { formatByteSize } from '../offline/format-byte-size';
import { isOfflineStorageSupported } from '../offline/offline-actions';
import { offlineStateStore } from '../offline/offline-state';
import {
  LibraryFilesConfirmationDialog,
  type LibraryFilesConfirmationDialogContent,
} from './library-files-confirmation-dialog';
import { useFolderOfflineRequests } from '../offline/use-folder-offline-requests';
import { useLibrarySelectionServices } from './library-selection-services';
import { useBulkChoices } from './bulk-choices-prompt/use-bulk-choices';
import {
  prepareBulkPlayback,
  type BulkAcknowledgment,
} from './bulk-playback-run';
import type {
  BulkSelectionItem,
  PlaybackExpansionContext,
} from './playback-expansion';

type PendingOfflineAction = {
  kind: 'keep' | 'remove';
  sources: DriveAudioSource[];
};

type UseBulkOfflineActionsOptions = {
  collections: { loops: NamedLoop[]; sources: DriveAudioSource[] };
  context: PlaybackExpansionContext;
  /** The selection in display order. */
  items: readonly BulkSelectionItem[];
  onAcknowledge: (acknowledgment: BulkAcknowledgment) => void;
  /** Called after an action finished, so the surface can leave selection mode. */
  onCompleted: () => void;
};

const formatFileCount = (count: number) =>
  `${count} ${count === 1 ? 'file' : 'files'}`;

/** What keeping these files will download: only files not stored yet count. */
export const describeKeepDownload = (
  sources: readonly Pick<DriveAudioSource, 'driveFileId' | 'sizeBytes'>[],
  isStored: (driveFileId: string) => boolean,
) => {
  const toDownload = sources.filter((source) => !isStored(source.driveFileId));
  const knownBytes = toDownload.reduce((total, source) => {
    return total + (source.sizeBytes ?? 0);
  }, 0);
  const unknownCount = toDownload.filter((source) => {
    return source.sizeBytes === undefined;
  }).length;

  if (toDownload.length === 0) {
    return 'Everything is already on this device, so nothing is downloaded.';
  }

  const size =
    unknownCount === 0
      ? formatByteSize(knownBytes)
      : `at least ${formatByteSize(knownBytes)} (${formatFileCount(unknownCount)} of unknown size)`;

  return `This downloads ${formatFileCount(toDownload.length)}, ${size}.`;
};

export const getKeepResultAcknowledgment = (
  result: OfflineBatchResult,
): BulkAcknowledgment => {
  const problems = [
    result.failed > 0
      ? `${formatFileCount(result.failed)} could not be downloaded${result.firstError ? ` (${result.firstError})` : ''}.`
      : '',
    result.notStored > 0
      ? `${formatFileCount(result.notStored)} could not be stored on this device.`
      : '',
    (result.scoresSkipped ?? 0) > 0
      ? `Sheet music for ${formatFileCount(result.scoresSkipped ?? 0)} could not be kept.`
      : '',
  ].filter((text) => text.length > 0);

  return {
    message: [`${formatFileCount(result.kept)} kept offline.`, ...problems]
      .join(' ')
      .trim(),
    title: problems.length > 0 ? 'Some files were not kept' : 'Kept offline',
  };
};

/**
 * `Keep offline` and `Remove from offline` for a selection or a folder. Like
 * the playback actions they settle the playlists-in-folders and repeated-items
 * questions first and expand folders and playlists into their audio files;
 * each file counts once. Both ask before running, with the number of files and
 * the size a keep will download.
 */
export const useBulkOfflineActions = ({
  collections,
  context,
  items,
  onAcknowledge,
  onCompleted,
}: UseBulkOfflineActionsOptions) => {
  const { prompt, resolveChoices } = useBulkChoices();
  const [pending, setPending] = useState<PendingOfflineAction | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const start = useCallback(
    async (
      kind: PendingOfflineAction['kind'],
      itemsOverride?: readonly BulkSelectionItem[],
    ) => {
      const selected = itemsOverride ?? items;
      const expansionOptions = await resolveChoices(selected, context);

      if (!expansionOptions) {
        return;
      }

      const { playableItems } = prepareBulkPlayback({
        collections,
        context,
        expansionOptions,
        items: selected,
      });
      if (playableItems.length === 0) {
        onAcknowledge({
          message: 'None of the selected items have a file to keep.',
          title: 'Nothing to keep',
        });

        return;
      }

      const sources = uniqueSourcesByFile(
        playableItems.map((item) => item.source),
      ).filter((source) => {
        const state = offlineStateStore.getState(source.driveFileId);

        // Removing only concerns files that are stored; keeping skips kept ones.
        return kind === 'keep' ? state !== 'kept' : state !== 'none';
      });

      if (sources.length === 0) {
        onAcknowledge({
          message:
            kind === 'keep'
              ? 'Everything selected is already kept offline.'
              : 'Nothing selected is stored offline.',
          title: 'Nothing to do',
        });

        return;
      }

      setPending({ kind, sources });
    },
    [collections, context, items, onAcknowledge, resolveChoices],
  );

  const confirm = useCallback(async () => {
    const action = pending;
    const runner = getOfflineBatchRunner();

    if (!action || !runner) {
      setPending(null);

      return;
    }

    setIsRunning(true);

    try {
      if (action.kind === 'remove') {
        await runner.removeSources(action.sources);
        onAcknowledge({
          message: `${formatFileCount(action.sources.length)} removed from offline.`,
          title: 'Removed from offline',
        });
      } else {
        onAcknowledge(
          getKeepResultAcknowledgment(await runner.keepSources(action.sources)),
        );
      }
    } catch (error) {
      onAcknowledge({
        message: error instanceof Error ? error.message : 'Try again.',
        title: 'Could not keep offline',
      });
    } finally {
      setIsRunning(false);
      setPending(null);
      onCompleted();
    }
  }, [onAcknowledge, onCompleted, pending]);

  const dialogContent =
    useMemo<LibraryFilesConfirmationDialogContent | null>(() => {
      if (!pending) {
        return null;
      }

      const count = formatFileCount(pending.sources.length);

      return pending.kind === 'keep'
        ? {
            confirmLabel: 'Keep offline',
            message: `${describeKeepDownload(pending.sources, (id) => offlineStateStore.getState(id) !== 'none')} Kept files stay on this device until you remove them.`,
            title: `Keep ${count} offline?`,
            tone: 'primary',
          }
        : {
            confirmLabel: 'Remove',
            message: 'They will stream again until you keep them offline.',
            title: `Remove ${count} from offline?`,
          };
    }, [pending]);

  const nodes: ReactNode = (
    <>
      {prompt}
      <LibraryFilesConfirmationDialog
        content={dialogContent}
        isMutating={isRunning}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          void confirm();
        }}
      />
    </>
  );

  const run = useMemo(
    () => ({
      keepOffline: (itemsOverride?: readonly BulkSelectionItem[]) => {
        void start('keep', itemsOverride);
      },
      removeOffline: (itemsOverride?: readonly BulkSelectionItem[]) => {
        void start('remove', itemsOverride);
      },
    }),
    [start],
  );

  return { nodes, run };
};

type BulkOfflineRun = ReturnType<typeof useBulkOfflineActions>['run'];

/** The handlers to add to a bar; none where offline storage is unavailable. */
export const createBulkOfflineHandlers = (run: BulkOfflineRun) => {
  if (!isOfflineStorageSupported) {
    return {};
  }

  return {
    'keep-offline': () => run.keepOffline(),
    'remove-offline': () => run.removeOffline(),
  } as const;
};

/**
 * The Files view's offline actions: the bar handlers, their dialogs, and the
 * folder rows' own `Keep offline` / `Remove from offline`.
 */
export const useFilesBulkOffline = (
  options: Omit<UseBulkOfflineActionsOptions, 'collections' | 'onAcknowledge'>,
) => {
  const services = useLibrarySelectionServices();
  const { nodes, run } = useBulkOfflineActions({
    ...options,
    collections: services.collections,
    onAcknowledge: services.acknowledge,
  });

  useFolderOfflineRequests(run);

  return { handlers: createBulkOfflineHandlers(run), nodes };
};
