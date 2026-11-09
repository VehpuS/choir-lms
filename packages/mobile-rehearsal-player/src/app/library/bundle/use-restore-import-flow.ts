import { useCallback, useEffect, useState } from 'react';
import type { DriveBundleListing } from '@org/google-drive';

import { buildFolderChoices, type FolderChoice } from './folder-choices';
import {
  buildImportPreview,
  runImport,
  type ImportPreview,
} from './import-bundle';
import { listBundleChoices, readBundle } from './read-bundle';
import { replaceLibraryFromBundle } from './replace-library';
import type {
  BundlePhase,
  BundleServiceDependencies,
} from './bundle-service-types';
import { useAbortableTask } from './use-abortable-task';
import type { ReadBundleResult } from './read-bundle';

export type FlowMode = 'restore' | 'import';
type ReadOk = Extract<ReadBundleResult, { status: 'ok' }>;

export type RestoreImportState =
  | { step: 'closed' }
  | { step: 'loading'; mode: FlowMode }
  | { step: 'list'; mode: FlowMode; bundles: DriveBundleListing[] }
  /** Restore only: the user picks Add or Replace; neither is preselected. */
  | { step: 'choose'; read: ReadOk; choice: 'add' | 'replace' | null }
  | { step: 'reading'; mode: FlowMode }
  | { step: 'preview'; mode: FlowMode; read: ReadOk; preview: ImportPreview }
  | {
      step: 'destination';
      read: ReadOk;
      preview: ImportPreview;
      folders: FolderChoice[];
      destinationId: string;
    }
  | { step: 'confirm-replace'; read: ReadOk }
  | { step: 'permission'; read: ReadOk }
  | { step: 'running'; kind: 'import' | 'replace'; phase: BundlePhase | null }
  | {
      step: 'import-done';
      needsAccessCount: number;
      folderName: string;
      failedMessage: string | null;
      wasCancelled: boolean;
    }
  | { step: 'replace-done'; safetyBackupName: string }
  | { step: 'refused'; message: string }
  | { step: 'failed'; message: string; librarySafe: boolean };

type Options = {
  deps: BundleServiceDependencies | null;
  hasWriteAccess: boolean;
  requestWriteAccess: () => void;
};

/**
 * The Restore from backup and Import shared library flows. They share the
 * list, the read and the additive import; restore adds the Add or Replace
 * choice, and Replace is the only step that needs the write permission.
 */
export const useRestoreImportFlow = ({
  deps,
  hasWriteAccess,
  requestWriteAccess,
}: Options) => {
  const [state, setState] = useState<RestoreImportState>({ step: 'closed' });
  const task = useAbortableTask();

  const open = useCallback(
    async (mode: FlowMode) => {
      if (!deps) {
        setState({
          step: 'failed',
          message: 'Connect Google Drive first.',
          librarySafe: true,
        });

        return;
      }

      setState({ step: 'loading', mode });

      const listed = await task.run((signal) =>
        listBundleChoices(deps, signal),
      );

      if (listed.status === 'cancelled') {
        return;
      }

      setState(
        listed.status === 'failed'
          ? { step: 'failed', message: listed.message, librarySafe: true }
          : { step: 'list', mode, bundles: listed.bundles },
      );
    },
    [deps, task],
  );

  const toPreview = useCallback(
    async (mode: FlowMode, read: ReadOk) => {
      if (!deps) {
        return;
      }

      setState({ step: 'reading', mode });

      const preview = await task.run((signal) =>
        buildImportPreview(deps, {
          bundle: read.bundle,
          bundleName: read.bundleName,
          droppedTotal: read.droppedTotal,
          signal,
        }),
      );

      if ('status' in preview) {
        return;
      }

      setState({ step: 'preview', mode, read, preview });
    },
    [deps, task],
  );

  const pick = useCallback(
    async (mode: FlowMode, listing: DriveBundleListing) => {
      if (!deps) {
        return;
      }

      setState({ step: 'reading', mode });

      const read = await task.run((signal) =>
        readBundle(deps, listing, signal),
      );

      if (read.status === 'cancelled') {
        return;
      }

      if (read.status === 'refused') {
        setState({ step: 'refused', message: read.message });
      } else if (read.status === 'failed') {
        setState({ step: 'failed', message: read.message, librarySafe: true });
      } else if (mode === 'restore' && read.isOwn) {
        setState({ step: 'choose', read, choice: null });
      } else {
        await toPreview(mode, read);
      }
    },
    [deps, task, toPreview],
  );

  const choose = useCallback((choice: 'add' | 'replace') => {
    setState((current) =>
      current.step === 'choose' ? { ...current, choice } : current,
    );
  }, []);

  const continueChoice = useCallback(() => {
    if (state.step !== 'choose' || !state.choice) {
      return;
    }

    if (state.choice === 'add') {
      void toPreview('restore', state.read);
    } else {
      setState({ step: 'confirm-replace', read: state.read });
    }
  }, [state, toPreview]);

  const chooseDestination = useCallback(async () => {
    if (state.step !== 'preview' || !deps) {
      return;
    }

    const input = await deps.library.load();
    const folders = buildFolderChoices(input.tree);

    setState({
      step: 'destination',
      read: state.read,
      preview: state.preview,
      folders,
      destinationId: input.tree.rootFolderId,
    });
  }, [deps, state]);

  const selectDestination = useCallback((destinationId: string) => {
    setState((current) =>
      current.step === 'destination' ? { ...current, destinationId } : current,
    );
  }, []);

  const startImport = useCallback(async () => {
    if (state.step !== 'destination' || !deps) {
      return;
    }

    const { preview, destinationId } = state;

    setState({ step: 'running', kind: 'import', phase: null });

    const run = await task.run((signal) =>
      runImport(deps, { preview, destinationFolderId: destinationId, signal }),
    );

    if (run.status === 'cancelled') {
      setState({ step: 'closed' });

      return;
    }

    const failed = run.result.outcomes.find(
      ({ status }) => status === 'failed',
    );

    setState({
      step: 'import-done',
      needsAccessCount: run.plan.summary.needsAccessTracks,
      folderName: run.plan.rootFolder.name,
      failedMessage: failed?.error ?? null,
      wasCancelled: run.result.status === 'cancelled',
    });
  }, [deps, state, task]);

  const startReplace = useCallback(
    async (read: ReadOk) => {
      if (!deps) {
        return;
      }

      if (!hasWriteAccess) {
        setState({ step: 'permission', read });

        return;
      }

      setState({ step: 'running', kind: 'replace', phase: null });

      const result = await task.run((signal) =>
        replaceLibraryFromBundle(deps, {
          bundle: read.bundle,
          bundleName: read.bundleName,
          isOwn: read.isOwn,
          signal,
          onProgress: (phase) =>
            setState((current) =>
              current.step === 'running' ? { ...current, phase } : current,
            ),
        }),
      );

      if (result.status === 'cancelled') {
        setState({ step: 'closed' });
      } else if (result.status === 'failed') {
        // The safety backup came first, so a failure leaves the library as it was.
        setState({
          step: 'failed',
          message: result.message,
          librarySafe: true,
        });
      } else {
        setState({
          step: 'replace-done',
          safetyBackupName: result.safetyBackupName,
        });
      }
    },
    [deps, hasWriteAccess, task],
  );

  const confirmReplace = useCallback(() => {
    if (state.step === 'confirm-replace') {
      void startReplace(state.read);
    }
  }, [startReplace, state]);

  useEffect(() => {
    if (state.step === 'permission' && hasWriteAccess) {
      setState({ step: 'confirm-replace', read: state.read });
    }
  }, [hasWriteAccess, state]);

  const close = useCallback(() => {
    task.cancel();
    setState({ step: 'closed' });
  }, [task]);

  return {
    state,
    open,
    pick,
    choose,
    continueChoice,
    chooseDestination,
    selectDestination,
    startImport,
    confirmReplace,
    close,
    allowSaving: requestWriteAccess,
    cancel: task.cancel,
  };
};
