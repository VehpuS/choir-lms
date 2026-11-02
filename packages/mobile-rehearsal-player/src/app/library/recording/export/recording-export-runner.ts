import type { Recording } from '@org/audio-library-models';
import type {
  DriveUploadSource,
  uploadDriveFileResumable,
} from '@org/google-drive';

import type { OriginalResolution } from '../recording-original';
import type {
  ExportDestination,
  ExportKind,
  ExportRunEvent,
} from './recording-export-model';
import { describeDestination } from './recording-export-model';
import {
  renderRecordingMix,
  type RecordingMixRenderDependencies,
} from './recording-mix-render';

/**
 * Runs the exports of one or more recordings one after another
 * (rehearsal-recording design Decision 12), reporting each step as an event for
 * the reducer in `recording-export-model`. Everything outside the run is
 * passed in, so a spec drives it with fakes.
 */

const WAV_MIME_TYPE = 'audio/wav';

export type ExportRunItem = {
  recording: Recording;
  fileName: string;
  /** A Drive session from an earlier attempt, to continue from. */
  resumeUri?: string;
};

export type ExportPlan = {
  kind: ExportKind;
  destination: ExportDestination;
  /** 0 is all track, 100 all recording; only a mix reads it. */
  balance: number;
  folder?: { folderId: string; folderName: string };
  /** Required for Drive; absent means the write permission is missing. */
  accessToken?: string;
  items: ExportRunItem[];
};

export type ExportRunnerDependencies = {
  readRecording: (id: string) => Promise<Blob | null>;
  resolveOriginal: (recording: Recording) => Promise<OriginalResolution>;
  decodeTrack: RecordingMixRenderDependencies['decodeTrack'];
  upload: typeof uploadDriveFileResumable;
  makeBlob: (parts: Uint8Array[], type: string) => Blob;
  saveToDevice: (fileName: string, blob: Blob) => Promise<void> | void;
};

type Dispatch = (event: ExportRunEvent) => void;

/** A blob read a window at a time, so a long file is never copied whole. */
export const blobUploadSource = (blob: Blob): DriveUploadSource => ({
  read: async (start, end) =>
    new Uint8Array(await blob.slice(start, end).arrayBuffer()),
  size: blob.size,
});

type Prepared = { status: 'ready'; blob: Blob } | { status: 'stopped' };

/** The file to deliver: the stored recording, or the rendered mix. */
const prepareFile = async (
  item: ExportRunItem,
  plan: ExportPlan,
  deps: ExportRunnerDependencies,
  dispatch: Dispatch,
  signal: AbortSignal,
): Promise<Prepared> => {
  const { recordingId } = { recordingId: item.recording.id };

  if (plan.kind === 'recording') {
    const blob = await deps.readRecording(recordingId);

    if (!blob) {
      dispatch({
        reason: 'recording-missing',
        recordingId,
        type: 'item-failed',
      });

      return { status: 'stopped' };
    }

    return { blob, status: 'ready' };
  }

  dispatch({ recordingId, status: 'rendering', type: 'item-started' });

  const original = await deps.resolveOriginal(item.recording);

  if (original.status === 'unavailable') {
    dispatch({ message: original.message, recordingId, type: 'item-skipped' });

    return { status: 'stopped' };
  }

  const rendered = await renderRecordingMix(
    item.recording,
    {
      balance: plan.balance,
      onProgress: (progress) =>
        dispatch({ progress, recordingId, type: 'item-progress' }),
      signal,
    },
    {
      decodeTrack: deps.decodeTrack,
      loadOriginal: original.load,
      readRecording: deps.readRecording,
    },
  );

  if (rendered.status === 'aborted') {
    return { status: 'stopped' };
  }

  if (rendered.status === 'failed') {
    dispatch({
      reason:
        rendered.reason === 'recording-missing'
          ? 'recording-missing'
          : rendered.reason,
      recordingId,
      type: 'item-failed',
    });

    return { status: 'stopped' };
  }

  return {
    blob: deps.makeBlob(rendered.parts, WAV_MIME_TYPE),
    status: 'ready',
  };
};

const deliver = async (
  item: ExportRunItem,
  blob: Blob,
  plan: ExportPlan,
  deps: ExportRunnerDependencies,
  dispatch: Dispatch,
  signal: AbortSignal,
): Promise<void> => {
  const recordingId = item.recording.id;
  const savedTo = describeDestination(
    plan.destination,
    plan.folder?.folderName,
  );

  if (plan.destination === 'download') {
    try {
      await deps.saveToDevice(item.fileName, blob);
      dispatch({ recordingId, savedTo, type: 'item-done' });
    } catch {
      dispatch({ reason: 'download', recordingId, type: 'item-failed' });
    }

    return;
  }

  dispatch({ recordingId, status: 'uploading', type: 'item-started' });

  if (!plan.accessToken || !plan.folder) {
    dispatch({
      reason: 'needs-write-access',
      recordingId,
      type: 'item-failed',
    });

    return;
  }

  const result = await deps.upload({
    accessToken: plan.accessToken,
    folderId: plan.folder.folderId,
    mimeType: WAV_MIME_TYPE,
    name: item.fileName,
    onProgress: (uploaded, total) =>
      dispatch({
        progress: total === 0 ? 1 : uploaded / total,
        recordingId,
        type: 'item-progress',
      }),
    onSession: (resumeUri) =>
      dispatch({ recordingId, resumeUri, type: 'item-session' }),
    resumeUri: item.resumeUri,
    signal,
    source: blobUploadSource(blob),
  });

  if (result.status === 'uploaded') {
    dispatch({ recordingId, savedTo, type: 'item-done' });
  } else if (result.status === 'failed') {
    // A failure keeps its session when retrying can use it (the reducer decides).
    if (result.resumeUri) {
      dispatch({
        recordingId,
        resumeUri: result.resumeUri,
        type: 'item-session',
      });
    }

    dispatch({ reason: result.reason, recordingId, type: 'item-failed' });
  }
};

export const runRecordingExports = async (
  plan: ExportPlan,
  deps: ExportRunnerDependencies,
  options: { signal: AbortSignal; dispatch: Dispatch },
): Promise<void> => {
  const { dispatch, signal } = options;

  for (const item of plan.items) {
    if (signal.aborted) {
      break;
    }

    const prepared = await prepareFile(item, plan, deps, dispatch, signal);

    if (prepared.status === 'ready' && !signal.aborted) {
      await deliver(item, prepared.blob, plan, deps, dispatch, signal);
    }
  }

  dispatch({ type: signal.aborted ? 'cancelled' : 'finished' });
};
