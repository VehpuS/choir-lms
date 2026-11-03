import { clearExportFailures, type Recording } from '@org/audio-library-models';

import type { RecordingsStore } from '../recordings-store-types';
import {
  getAutoExportGate,
  getAutoExportJobs,
  getRetryDelayMs,
  jobKey,
  shouldRetryAutomatically,
  type AutoExportGate,
  type AutoExportJob,
  type AutoExportSession,
  type AutoExportSettings,
  type ConnectionType,
} from './auto-export-model';
import {
  createExportRun,
  defaultExportFileName,
  reduceExportRun,
  type ExportFailureReason,
  type ExportRun,
} from './recording-export-model';
import {
  recordDriveExportDone,
  recordDriveExportFailure,
} from './record-drive-export';
import {
  runRecordingExports,
  type ExportRunnerDependencies,
} from './recording-export-runner';

/**
 * The background export queue (rehearsal-recording design Decision 19). What is
 * due is worked out from the recordings and the settings every time, so nothing
 * separate is persisted and a reload resumes where it stopped. It uploads one
 * copy at a time, never repeats a kind, and only the app being open drives it.
 */

export type Connectivity = {
  isOnline: () => boolean;
  connectionType: () => ConnectionType;
  /** Called when the connection comes or goes, or its type changes. */
  subscribe: (listener: () => void) => () => void;
};

export type AutoExportStatus = {
  /** Why nothing is uploading, when something could be. */
  gate: AutoExportGate;
  running?: {
    recordingId: string;
    kind: AutoExportJob['kind'];
    progress: number;
  };
  /** When the earliest waiting retry is due (`now()` milliseconds). */
  nextRetryAt?: number;
};

export type AutoExportQueueOptions = {
  store: Pick<RecordingsStore, 'list' | 'modify'>;
  getSettings: () => AutoExportSettings;
  getSession: () => AutoExportSession;
  connectivity: Connectivity;
  /** Everything the runner calls outside itself; its `recordUploaded` is replaced by the queue's own. */
  dependencies: ExportRunnerDependencies;
  now?: () => Date;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

type Backoff = { attempts: number; dueAt: number };

export const createAutoExportQueue = (options: AutoExportQueueOptions) => {
  const { connectivity, dependencies, store } = options;
  const now = options.now ?? (() => new Date());
  const setTimer =
    options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimer =
    options.clearTimer ??
    ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const backoff = new Map<string, Backoff>();
  const listeners = new Set<() => void>();
  let status: AutoExportStatus = { gate: { reason: 'off', state: 'held' } };
  let isRunning = false;
  let isDirty = false;
  let isDisposed = false;
  let controller: AbortController | null = null;
  let retryTimer: unknown = null;

  const publish = (next: AutoExportStatus) => {
    status = next;
    listeners.forEach((listener) => listener());
  };

  const readGate = (): AutoExportGate =>
    getAutoExportGate({
      connectionType: connectivity.connectionType(),
      online: connectivity.isOnline(),
      session: options.getSession(),
      settings: options.getSettings(),
    });

  const isWaiting = (key: string) =>
    (backoff.get(key)?.dueAt ?? 0) > now().getTime();

  const scheduleRetry = () => {
    if (retryTimer !== null) {
      clearTimer(retryTimer);
      retryTimer = null;
    }

    const due = [...backoff.values()].map((entry) => entry.dueAt);

    if (due.length === 0 || isDisposed) {
      return undefined;
    }

    const next = Math.min(...due);

    retryTimer = setTimer(
      () => {
        retryTimer = null;
        void kick();
      },
      Math.max(0, next - now().getTime()),
    );

    return next;
  };

  /** The outcome of one export, from the events the runner reported. */
  /** Returns true when a temporary failure means the pass should wait for its retry. */
  const settle = async (
    job: AutoExportJob,
    run: ExportRun,
  ): Promise<boolean> => {
    const item = run.items[0];
    const key = jobKey(job.recording.id, job.kind);

    if (item?.status === 'done') {
      backoff.delete(key);

      return false;
    }

    // A mix whose original is unavailable is a failure to record, not a skip.
    const reason: ExportFailureReason | undefined =
      item?.status === 'skipped' ? 'original' : item?.failure;

    if (!reason) {
      return false;
    }

    if (shouldRetryAutomatically(reason)) {
      const attempts = (backoff.get(key)?.attempts ?? 0) + 1;

      backoff.set(key, {
        attempts,
        dueAt: now().getTime() + getRetryDelayMs(attempts),
      });

      return true;
    }

    backoff.delete(key);
    await recordDriveExportFailure(store, job.recording.id, {
      kind: job.kind,
      now: now(),
      reason,
    });

    return false;
  };

  const runJob = async (job: AutoExportJob): Promise<boolean> => {
    const { recording } = job;
    const settings = options.getSettings();
    const session = options.getSession();
    const abort = new AbortController();
    let run = createExportRun([
      {
        fileName: defaultExportFileName(recording, job.kind),
        recordingId: recording.id,
      },
    ]);

    controller = abort;
    publish({
      ...status,
      running: { kind: job.kind, progress: 0, recordingId: recording.id },
    });

    await runRecordingExports(
      {
        accessToken: session.accessToken,
        balance: recording.balance,
        destination: 'drive',
        folder: settings.folder,
        items: [{ fileName: run.items[0]?.fileName ?? '', recording }],
        kind: job.kind,
      },
      {
        ...dependencies,
        recordUploaded: (uploaded, entry) =>
          recordDriveExportDone(store, uploaded.id, { ...entry, now: now() }),
      },
      {
        dispatch: (event) => {
          run = reduceExportRun(run, event);

          if (event.type === 'item-progress') {
            publish({
              ...status,
              running: {
                kind: job.kind,
                progress: event.progress,
                recordingId: recording.id,
              },
            });
          }
        },
        signal: abort.signal,
      },
    );
    controller = null;

    return abort.signal.aborted ? false : settle(job, run);
  };

  const loop = async () => {
    do {
      isDirty = false;

      for (;;) {
        const gate = readGate();

        if (gate.state === 'held' || isDisposed) {
          publish({ gate });

          return;
        }

        let recordings: Recording[];

        try {
          recordings = await store.list();
        } catch {
          // Where recordings cannot be stored there is nothing to export.
          publish({ gate });

          return;
        }
        const [job] = getAutoExportJobs(
          recordings,
          options.getSettings(),
          isWaiting,
        );

        if (!job) {
          publish({ gate, nextRetryAt: scheduleRetry() });

          break;
        }

        try {
          // A temporary failure ends the pass: the connection or Drive is the
          // likely cause, so the next job would fail too (and a mix costs a
          // render). The retry timer picks it up again.
          if (await runJob(job)) {
            publish({ gate, nextRetryAt: scheduleRetry() });

            break;
          }
        } catch {
          // Writing the record failed: wait before this job comes up again
          // rather than spinning on it.
          const key = jobKey(job.recording.id, job.kind);
          const attempts = (backoff.get(key)?.attempts ?? 0) + 1;

          backoff.set(key, {
            attempts,
            dueAt: now().getTime() + getRetryDelayMs(attempts),
          });
          publish({ gate, nextRetryAt: scheduleRetry() });

          break;
        }
      }
    } while (isDirty && !isDisposed);
  };

  /** Looks for due exports and runs them; safe to call as often as anything changes. */
  const kick = async (): Promise<void> => {
    if (isRunning) {
      isDirty = true;

      return;
    }

    isRunning = true;

    try {
      await loop();
    } finally {
      isRunning = false;
    }
  };

  // A connection that changes is a chance to try again at once.
  const unsubscribe = connectivity.subscribe(() => {
    backoff.clear();
    void kick();
  });

  return {
    kick,
    /** `Retry` on a row: forget its recorded failures and try again now. */
    retry: async (recordingId: string) => {
      await store.modify(recordingId, (recording) => ({
        exports: clearExportFailures(recording),
      }));

      for (const key of [...backoff.keys()]) {
        if (key.startsWith(`${recordingId}:`)) {
          backoff.delete(key);
        }
      }

      await kick();
    },
    getStatus: () => status,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      isDisposed = true;
      controller?.abort();
      unsubscribe();

      if (retryTimer !== null) {
        clearTimer(retryTimer);
      }
    },
  };
};
