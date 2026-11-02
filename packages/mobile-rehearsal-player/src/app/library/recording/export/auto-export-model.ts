import {
  getMissingExportKinds,
  getRecordingExports,
  type AutoExportWhat,
  type Recording,
  type RecordingExportKind,
} from '@org/audio-library-models';

import {
  isRetryableFailure,
  type ExportFailureReason,
} from './recording-export-model';

/**
 * The decisions of the background export queue, as pure functions
 * (rehearsal-recording design Decision 19): whether uploads may run now, which
 * export is due next, and how long to wait after a temporary failure. The queue
 * in `auto-export-queue.ts` only applies them.
 */

export type UploadOver = 'wifi' | 'any';

/** What the browser reports; most cannot tell, and say `unknown`. */
export type ConnectionType = 'wifi' | 'ethernet' | 'cellular' | 'unknown';

export type AutoExportSettings = {
  enabled: boolean;
  what: AutoExportWhat;
  /** Where copies go; absent until a folder is chosen or created. */
  folder?: { folderId: string; folderName: string };
  uploadOver: UploadOver;
  /**
   * Recordings made before this moment (an ISO time) are left alone, so turning
   * the setting on or changing what it exports does not upload the past. `null`
   * means every recording is eligible (`Back up existing recordings`).
   */
  eligibleFrom: string | null;
};

export type AutoExportSession = {
  accessToken: string | undefined;
  hasWriteAccess: boolean;
};

export type AutoExportHold =
  | 'off'
  | 'no-folder'
  | 'no-session'
  | 'offline'
  | 'cellular';

export type AutoExportGate =
  | { state: 'ready' }
  | { state: 'held'; reason: AutoExportHold };

export const getAutoExportGate = (input: {
  settings: AutoExportSettings;
  session: AutoExportSession;
  online: boolean;
  connectionType: ConnectionType;
}): AutoExportGate => {
  const { connectionType, online, session, settings } = input;

  if (!settings.enabled) {
    return { reason: 'off', state: 'held' };
  }

  if (!settings.folder) {
    return { reason: 'no-folder', state: 'held' };
  }

  if (!session.accessToken || !session.hasWriteAccess) {
    return { reason: 'no-session', state: 'held' };
  }

  if (!online) {
    return { reason: 'offline', state: 'held' };
  }

  // Only a connection the browser says is cellular holds uploads; one it
  // cannot classify runs (the setting says so in words).
  return settings.uploadOver === 'wifi' && connectionType === 'cellular'
    ? { reason: 'cellular', state: 'held' }
    : { state: 'ready' };
};

export type AutoExportJob = {
  recording: Recording;
  kind: RecordingExportKind;
};

export const jobKey = (recordingId: string, kind: RecordingExportKind) =>
  `${recordingId}:${kind}`;

const isEligible = (recording: Recording, eligibleFrom: string | null) =>
  eligibleFrom === null || recording.createdAt >= eligibleFrom;

/**
 * Every export that is due: the wanted kinds a recording has no copy of and no
 * recorded failure for, newest recording first, the recording alone before the
 * mix. `isWaiting` holds back a job still inside its retry delay.
 */
export const getAutoExportJobs = (
  recordings: readonly Recording[],
  settings: AutoExportSettings,
  isWaiting: (key: string) => boolean = () => false,
): AutoExportJob[] => {
  const newestFirst = [...recordings].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );

  return newestFirst
    .filter((recording) => isEligible(recording, settings.eligibleFrom))
    .flatMap((recording) => {
      const failed = getRecordingExports(recording).failed.map(
        ({ kind }) => kind,
      );

      return getMissingExportKinds(recording, settings.what)
        .filter(
          (kind) =>
            !failed.includes(kind) && !isWaiting(jobKey(recording.id, kind)),
        )
        .map((kind) => ({ kind, recording }));
    });
};

/** Waits after the first, second, third, … temporary failure; the last repeats. */
export const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000] as const;

export const getRetryDelayMs = (failedAttempts: number): number =>
  RETRY_DELAYS_MS[
    Math.min(Math.max(failedAttempts, 1), RETRY_DELAYS_MS.length) - 1
  ] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

/** A temporary failure is retried by itself; any other waits for a manual `Retry`. */
export const shouldRetryAutomatically = (reason: ExportFailureReason) =>
  isRetryableFailure(reason);
