import type {
  Recording,
  RecordingExportDone,
  RecordingExportFailure,
  RecordingExportKind,
  RecordingExports,
} from './recording.ts';

/**
 * What a recording has on Drive (rehearsal-recording design Decision 19). The
 * record is the only state the export queue keeps: what still has to go is
 * what the settings ask for minus what is recorded here, so a reload resumes
 * and a kind is never uploaded twice.
 */

export type AutoExportWhat = 'recording' | 'mix' | 'both';

type RecordingWithExports = Pick<Recording, 'exports'>;

const EMPTY_EXPORTS: RecordingExports = { done: [], failed: [] };

export const getRecordingExports = (
  recording: RecordingWithExports,
): RecordingExports => recording.exports ?? EMPTY_EXPORTS;

/** The kinds a setting asks for, the recording alone first so a failed mix never holds it back. */
export const getWantedExportKinds = (
  what: AutoExportWhat,
): RecordingExportKind[] => (what === 'both' ? ['recording', 'mix'] : [what]);

export const isExported = (
  recording: RecordingWithExports,
  kind: RecordingExportKind,
): boolean =>
  getRecordingExports(recording).done.some((entry) => entry.kind === kind);

/** The wanted kinds with no copy on Drive yet, in upload order. */
export const getMissingExportKinds = (
  recording: RecordingWithExports,
  what: AutoExportWhat,
): RecordingExportKind[] =>
  getWantedExportKinds(what).filter((kind) => !isExported(recording, kind));

/** Records a finished copy; one per kind, so a repeat replaces the earlier entry. */
export const recordExportDone = (
  recording: RecordingWithExports,
  entry: RecordingExportDone,
): RecordingExports => {
  const { done, failed } = getRecordingExports(recording);

  return {
    done: [...done.filter(({ kind }) => kind !== entry.kind), entry],
    failed: failed.filter(({ kind }) => kind !== entry.kind),
  };
};

/** Records why a kind failed, unless that kind already reached Drive. */
export const recordExportFailure = (
  recording: RecordingWithExports,
  failure: RecordingExportFailure,
): RecordingExports => {
  const exports = getRecordingExports(recording);

  if (isExported(recording, failure.kind)) {
    return exports;
  }

  return {
    done: exports.done,
    failed: [
      ...exports.failed.filter(({ kind }) => kind !== failure.kind),
      failure,
    ],
  };
};

/** Forgets failures so the queue tries those kinds again (the row's `Retry`). */
export const clearExportFailures = (
  recording: RecordingWithExports,
  kinds?: readonly RecordingExportKind[],
): RecordingExports => {
  const exports = getRecordingExports(recording);

  return {
    done: exports.done,
    failed: kinds
      ? exports.failed.filter(({ kind }) => !kinds.includes(kind))
      : [],
  };
};

export type RecordingExportStatus =
  /** Nothing asked for and nothing on Drive. */
  | { state: 'none' }
  | { state: 'on-drive'; kinds: RecordingExportKind[] }
  | { state: 'pending'; kinds: RecordingExportKind[] }
  | { state: 'failed'; failures: RecordingExportFailure[] };

/**
 * What a row shows. With nothing asked for (auto-export off) a recording is
 * `on-drive` once any copy exists; otherwise it is `failed` while a wanted kind
 * has failed, `pending` while one is missing, and `on-drive` when all are there.
 */
export const getRecordingExportStatus = (
  recording: RecordingWithExports,
  what: AutoExportWhat | null,
): RecordingExportStatus => {
  const { done, failed } = getRecordingExports(recording);
  const doneKinds = done.map(({ kind }) => kind);

  if (what === null) {
    return doneKinds.length > 0
      ? { kinds: doneKinds, state: 'on-drive' }
      : { state: 'none' };
  }

  const missing = getMissingExportKinds(recording, what);
  const failures = failed.filter(({ kind }) => missing.includes(kind));

  if (failures.length > 0) {
    return { failures, state: 'failed' };
  }

  return missing.length > 0
    ? { kinds: missing, state: 'pending' }
    : { kinds: doneKinds, state: 'on-drive' };
};
