import type { Recording } from '@org/audio-library-models';
import { useCallback, useEffect, useState } from 'react';

import { backUpLibrary } from './backup-library';
import type {
  BundlePhase,
  BundleServiceDependencies,
} from './bundle-service-types';
import { useAbortableTask } from './use-abortable-task';

export type BackupState =
  | { step: 'closed' }
  /** The session cannot write to Drive yet. */
  | { step: 'permission' }
  | {
      step: 'confirm';
      counts: { tracks: number; loops: number; playlists: number };
      recordings: Recording[];
      selected: ReadonlySet<string>;
    }
  | { step: 'saving'; phase: BundlePhase | null; includesRecordings: boolean }
  | { step: 'done'; removedBackups: number }
  | { step: 'failed'; message: string };

type BackupFlowOptions = {
  deps: BundleServiceDependencies | null;
  hasWriteAccess: boolean;
  requestWriteAccess: () => void;
};

/** The Back up library flow: permission check, recording choice, save, result. */
export const useBackupFlow = ({
  deps,
  hasWriteAccess,
  requestWriteAccess,
}: BackupFlowOptions) => {
  const [state, setState] = useState<BackupState>({ step: 'closed' });
  const task = useAbortableTask();

  const toConfirm = useCallback(async () => {
    if (!deps) {
      return;
    }

    const [recordings, input] = await Promise.all([
      deps.library.recordings(),
      deps.library.load(),
    ]);

    setState({
      step: 'confirm',
      counts: {
        tracks: input.sources.filter((source) => !source.adjustment).length,
        loops: input.loops.length,
        playlists: input.playlists.length,
      },
      recordings: [...recordings],
      selected: new Set(),
    });
  }, [deps]);

  const open = useCallback(() => {
    if (!deps || !hasWriteAccess) {
      setState({ step: 'permission' });

      return;
    }

    void toConfirm();
  }, [deps, hasWriteAccess, toConfirm]);

  // Granting the permission moves on by itself.
  useEffect(() => {
    if (state.step === 'permission' && deps && hasWriteAccess) {
      void toConfirm();
    }
  }, [deps, hasWriteAccess, state.step, toConfirm]);

  const toggleRecording = useCallback((id: string) => {
    setState((current) => {
      if (current.step !== 'confirm') {
        return current;
      }

      const selected = new Set(current.selected);

      if (!selected.delete(id)) {
        selected.add(id);
      }

      return { ...current, selected };
    });
  }, []);

  const start = useCallback(async () => {
    if (state.step !== 'confirm' || !deps) {
      return;
    }

    const { selected } = state;

    setState({
      step: 'saving',
      phase: null,
      includesRecordings: selected.size > 0,
    });

    const result = await task.run((signal) =>
      backUpLibrary(deps, {
        selectedRecordingIds: selected,
        signal,
        onProgress: (phase) =>
          setState((current) =>
            current.step === 'saving' ? { ...current, phase } : current,
          ),
      }),
    );

    if (result.status === 'cancelled') {
      setState({ step: 'closed' });
    } else if (result.status === 'failed') {
      setState({ step: 'failed', message: result.message });
    } else {
      setState({ step: 'done', removedBackups: result.removedBackups });
    }
  }, [deps, state, task]);

  const close = useCallback(() => {
    task.cancel();
    setState({ step: 'closed' });
  }, [task]);

  return {
    state,
    open,
    close,
    start,
    toggleRecording,
    allowSaving: requestWriteAccess,
    cancel: task.cancel,
  };
};
