import type { Recording } from '@org/audio-library-models';
import type { DriveUploadFailureReason } from '@org/google-drive';

import type { OriginalResolution } from '../recording-original';

/**
 * The pure side of exporting recordings (rehearsal-recording design Decision
 * 12): names, what a mix needs, the words for each failure, and the state of a
 * run of one or more exports. The screen and the runner only report events
 * into the reducer here.
 */

export type ExportKind = 'recording' | 'mix';
export type ExportDestination = 'drive' | 'download';

export type ExportFailureReason =
  | DriveUploadFailureReason
  /** The stored recording could not be read. */
  | 'recording-missing'
  /** The original track could not be fetched or decoded. */
  | 'original'
  | 'render'
  | 'download';

export const EXPORT_COPY = {
  title: 'Export',
  kindRecordingLabel: 'Recording only',
  kindMixLabel: 'Mix with track',
  recordingHint: 'Your voice only, at its natural speed.',
  mixHint:
    'Plays as you heard it while recording, with the recording mixed in.',
  balanceLabel: 'Balance',
  balanceTrackEnd: 'Track',
  balanceRecordingEnd: 'Mine',
  keepBalanceLabel: 'Keep as the saved balance',
  previewLabel: 'Preview',
  destinationDriveLabel: 'Save to Drive',
  destinationDownloadLabel: 'Download',
  folderLabel: 'Folder',
  changeFolderLabel: 'Change',
  chooseFolderLabel: 'Choose a folder',
  nameLabel: 'Name',
  driveNote:
    'Nothing is written to Drive until you confirm. Drive asks for permission here if needed.',
  downloadNote: 'Saved by the browser. No Drive permission or network needed.',
  cancelLabel: 'Cancel',
  exportAnywayLabel: 'Export anyway',
  tryAgainLabel: 'Try again',
  closeLabel: 'Close',
  doneLabel: 'Done',
  changedWarning:
    'The track on Drive changed since this was recorded. The mix may not line up. Export anyway?',
  failedTitle: 'Export failed',
  doneTitle: 'Exported',
  unchangedNote: 'The recording is unchanged.',
} as const;

const FAILURE_MESSAGES: Record<ExportFailureReason, string> = {
  'needs-write-access':
    'Google Drive did not allow saving. Allow saving to Drive and try again.',
  quota: 'Google Drive says you are out of storage.',
  'folder-not-writable':
    'That folder cannot be written to. Choose another folder.',
  offline: 'You appear to be offline. Try again when you are connected.',
  'too-large': 'Google Drive would not accept a file this large.',
  unavailable: 'Google Drive could not save the file right now.',
  'recording-missing': 'The recording could not be read from this device.',
  original:
    'The original track could not be fetched, so the mix could not be made.',
  render: 'The mix could not be made.',
  download: 'The browser could not save the file.',
};

export const exportFailureMessage = (reason: ExportFailureReason): string =>
  FAILURE_MESSAGES[reason];

const UNKNOWN_FAILURE_MESSAGE = 'The export did not complete.';

/** For a reason read back from storage, which may predate or postdate this list. */
export const describeStoredFailure = (reason: string): string =>
  (FAILURE_MESSAGES as Record<string, string | undefined>)[reason] ??
  UNKNOWN_FAILURE_MESSAGE;

/** Failures that retrying the same upload can fix, so the session is kept. */
export const isRetryableFailure = (reason: ExportFailureReason): boolean =>
  reason === 'offline' || reason === 'unavailable';

const FILE_EXTENSION_PATTERN = /\.[A-Za-z0-9]{2,5}$/;
const FORBIDDEN_NAME_CHARACTERS_PATTERN = /[\\/:*?"<>|]+/g;
const FIRST_PRINTABLE_CODE = 32;
const WHITESPACE_RUN_PATTERN = /\s+/g;
const WAV_EXTENSION_PATTERN = /\.wav$/i;
const WAV_EXTENSION = '.wav';
const MIX_SUFFIX = ' (mix)';
const NAME_SEPARATOR = ' - ';
const FALLBACK_NAME = 'Recording';
const MAX_NAME_LENGTH = 120;

const withoutControlCharacters = (name: string): string =>
  Array.from(name)
    .filter(
      (character) => (character.codePointAt(0) ?? 0) >= FIRST_PRINTABLE_CODE,
    )
    .join('');

const sanitizeName = (name: string): string =>
  withoutControlCharacters(name)
    .replace(FORBIDDEN_NAME_CHARACTERS_PATTERN, '-')
    .replace(WHITESPACE_RUN_PATTERN, ' ')
    .trim();

/** The file name a Drive or device file starts with: `<Track> - <Recording>.wav`, with `(mix)` for a mix. */
export const defaultExportFileName = (
  recording: Pick<Recording, 'name' | 'source'>,
  kind: ExportKind,
): string => {
  const trackName = recording.source.name.replace(FILE_EXTENSION_PATTERN, '');
  const base = sanitizeName(
    `${trackName}${NAME_SEPARATOR}${recording.name}${kind === 'mix' ? MIX_SUFFIX : ''}`,
  );

  return `${base.slice(0, MAX_NAME_LENGTH) || FALLBACK_NAME}${WAV_EXTENSION}`;
};

/** A typed name made safe, with `.wav` added; an empty name falls back to the default. */
export const normalizeExportFileName = (
  typed: string,
  fallback: string,
): string => {
  const base = sanitizeName(typed.replace(WAV_EXTENSION_PATTERN, ''));

  return base === ''
    ? fallback
    : `${base.slice(0, MAX_NAME_LENGTH)}${WAV_EXTENSION}`;
};

export type MixAvailability =
  | { state: 'ready' }
  | { state: 'changed'; message: string }
  | { state: 'unavailable'; message: string };

/** What the dialog says about making a mix, from where the original resolves. */
export const describeMixAvailability = (
  resolution: OriginalResolution,
): MixAvailability => {
  if (resolution.status === 'unavailable') {
    return {
      message: [
        `The mix is unavailable: ${resolution.message}`,
        'The recording alone can still be exported.',
      ].join(' '),
      state: 'unavailable',
    };
  }

  return resolution.changed
    ? { message: EXPORT_COPY.changedWarning, state: 'changed' }
    : { state: 'ready' };
};

export type ExportItemStatus =
  | 'pending'
  | 'rendering'
  | 'uploading'
  | 'done'
  | 'failed'
  | 'skipped';

export type ExportItem = {
  recordingId: string;
  fileName: string;
  status: ExportItemStatus;
  /** 0 to 1 within this item. */
  progress: number;
  failure?: ExportFailureReason;
  /** Why a mix was left out (its original is unavailable). */
  skippedMessage?: string;
  /** A Drive session to continue from on a retry. */
  resumeUri?: string;
  /** Where it went: the folder name, or `Downloads`. */
  savedTo?: string;
};

export type ExportRun = {
  items: ExportItem[];
  step: 'running' | 'finished' | 'cancelled';
};

export type ExportRunEvent =
  | {
      type: 'item-started';
      recordingId: string;
      status: 'rendering' | 'uploading';
    }
  | { type: 'item-progress'; recordingId: string; progress: number }
  | { type: 'item-session'; recordingId: string; resumeUri: string }
  | { type: 'item-done'; recordingId: string; savedTo: string }
  | {
      type: 'item-failed';
      recordingId: string;
      reason: ExportFailureReason;
    }
  | { type: 'item-skipped'; recordingId: string; message: string }
  | { type: 'finished' }
  | { type: 'cancelled' }
  /** Failed items go again; done ones are not repeated. */
  | { type: 'retry' };

export const createExportRun = (
  items: ReadonlyArray<Pick<ExportItem, 'fileName' | 'recordingId'>>,
): ExportRun => ({
  items: items.map(({ fileName, recordingId }) => ({
    fileName,
    progress: 0,
    recordingId,
    status: 'pending',
  })),
  step: 'running',
});

const updateItem = (
  run: ExportRun,
  recordingId: string,
  change: (item: ExportItem) => ExportItem,
): ExportRun => ({
  ...run,
  items: run.items.map((item) =>
    item.recordingId === recordingId ? change(item) : item,
  ),
});

export const reduceExportRun = (
  run: ExportRun,
  event: ExportRunEvent,
): ExportRun => {
  switch (event.type) {
    case 'item-started':
      return updateItem(run, event.recordingId, (item) => ({
        ...item,
        failure: undefined,
        progress: 0,
        status: event.status,
      }));
    case 'item-progress':
      return updateItem(run, event.recordingId, (item) => ({
        ...item,
        progress: Math.min(1, Math.max(0, event.progress)),
      }));
    case 'item-session':
      return updateItem(run, event.recordingId, (item) => ({
        ...item,
        resumeUri: event.resumeUri,
      }));
    case 'item-done':
      return updateItem(run, event.recordingId, (item) => ({
        ...item,
        progress: 1,
        resumeUri: undefined,
        savedTo: event.savedTo,
        status: 'done',
      }));
    case 'item-failed':
      return updateItem(run, event.recordingId, (item) => ({
        ...item,
        failure: event.reason,
        // A permanent failure drops the session; a transient one keeps it.
        resumeUri: isRetryableFailure(event.reason)
          ? item.resumeUri
          : undefined,
        status: 'failed',
      }));
    case 'item-skipped':
      return updateItem(run, event.recordingId, (item) => ({
        ...item,
        progress: 1,
        skippedMessage: event.message,
        status: 'skipped',
      }));
    case 'finished':
      return { ...run, step: 'finished' };
    case 'cancelled':
      return { ...run, step: 'cancelled' };
    case 'retry':
      return {
        items: run.items.map((item) =>
          item.status === 'failed'
            ? { ...item, failure: undefined, progress: 0, status: 'pending' }
            : item,
        ),
        step: 'running',
      };
  }
};

/** Overall progress from 0 to 1; finished and skipped items count as complete. */
export const exportRunProgress = (run: ExportRun): number => {
  if (run.items.length === 0) {
    return 1;
  }

  const total = run.items.reduce(
    (sum, item) => sum + (item.status === 'failed' ? 0 : item.progress),
    0,
  );

  return total / run.items.length;
};

export type ExportRunSummary = {
  done: number;
  failed: number;
  skipped: number;
  total: number;
  /** The first failure, for the message a single export shows. */
  firstFailure?: ExportFailureReason;
};

export const summarizeExportRun = (run: ExportRun): ExportRunSummary => {
  const count = (status: ExportItemStatus) =>
    run.items.filter((item) => item.status === status).length;

  return {
    done: count('done'),
    failed: count('failed'),
    firstFailure: run.items.find((item) => item.failure)?.failure,
    skipped: count('skipped'),
    total: run.items.length,
  };
};

/** Where an export lands, in words: the folder name or the browser's downloads. */
export const describeDestination = (
  destination: ExportDestination,
  folderName: string | undefined,
): string => (destination === 'drive' ? (folderName ?? 'Drive') : 'Downloads');
