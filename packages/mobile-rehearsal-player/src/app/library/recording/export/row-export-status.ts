import {
  getRecordingExports,
  getWantedExportKinds,
  type Recording,
  type RecordingExportKind,
} from '@org/audio-library-models';

import type { AutoExportSettings } from './auto-export-model';
import { describeStoredFailure } from './recording-export-model';

/**
 * What a recording's row says about Drive, and what the status sheet lists
 * (rehearsal-recording design Decision 19). Auto-export only speaks for the
 * recordings it covers: with it off, or for a recording made before it was
 * turned on, the row reflects what actually reached Drive and nothing is
 * promised.
 */

export type RowExportStatus = 'on-drive' | 'pending' | 'failed' | 'none';

const isCovered = (recording: Recording, settings: AutoExportSettings) =>
  settings.enabled &&
  (settings.eligibleFrom === null ||
    recording.createdAt >= settings.eligibleFrom);

export const getRowExportStatus = (
  recording: Recording,
  settings: AutoExportSettings,
): RowExportStatus => {
  const { done, failed } = getRecordingExports(recording);

  if (!isCovered(recording, settings)) {
    return done.length > 0 ? 'on-drive' : failed.length > 0 ? 'failed' : 'none';
  }

  const wanted = getWantedExportKinds(settings.what);
  const isDone = (kind: RecordingExportKind) =>
    done.some((entry) => entry.kind === kind);

  if (
    wanted.some((kind) => !isDone(kind) && failed.some((f) => f.kind === kind))
  ) {
    return 'failed';
  }

  return wanted.every(isDone) ? 'on-drive' : 'pending';
};

export const EXPORT_KIND_LABELS: Record<RecordingExportKind, string> = {
  mix: 'Mix',
  recording: 'Recording only',
};

export type ExportKindLine = {
  kind: RecordingExportKind;
  label: string;
  state: 'on-drive' | 'pending' | 'failed' | 'not-exported';
  /** The Drive file and folder, the reason it failed, or what it is waiting for. */
  detail: string;
  canRetry: boolean;
};

/** One line per kind that is on Drive, failed, or wanted by the setting. */
export const getExportKindLines = (
  recording: Recording,
  settings: AutoExportSettings,
): ExportKindLine[] => {
  const { done, failed } = getRecordingExports(recording);
  const wanted = isCovered(recording, settings)
    ? getWantedExportKinds(settings.what)
    : [];
  const kinds = (['recording', 'mix'] as const).filter(
    (kind) =>
      wanted.includes(kind) ||
      done.some((entry) => entry.kind === kind) ||
      failed.some((entry) => entry.kind === kind),
  );

  return kinds.map((kind) => {
    const copy = done.find((entry) => entry.kind === kind);
    const failure = failed.find((entry) => entry.kind === kind);

    if (copy) {
      return {
        canRetry: false,
        detail: `${copy.fileName} in ${copy.folderName}`,
        kind,
        label: EXPORT_KIND_LABELS[kind],
        state: 'on-drive',
      };
    }

    if (failure) {
      return {
        canRetry: true,
        detail: describeStoredFailure(failure.reason),
        kind,
        label: EXPORT_KIND_LABELS[kind],
        state: 'failed',
      };
    }

    return {
      canRetry: false,
      detail: 'Waiting to upload.',
      kind,
      label: EXPORT_KIND_LABELS[kind],
      state: 'pending',
    };
  });
};
