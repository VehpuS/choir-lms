import {
  encodeWavParts,
  renderComposite,
  type CompositeRenderShaping,
  type PcmWindowReader,
  type SumShaper,
} from '@org/audio-mixing';

import type {
  ExportDestination,
  ExportRunEvent,
} from '../../recording/export/recording-export-model';
import {
  deliverExportFile,
  type ExportRunnerDependencies,
} from '../../recording/export/recording-export-runner';
import type { LoadStem } from '../loading/composite-stem-loader';
import { isStorageFullError } from '../prepared/composite-room';
import type { CompositeExportStem } from './composite-export-model';

/**
 * Runs one composite export (composite-tracks 10.2, design Decision 13):
 * prepares every stem that is not yet prepared (with progress), renders the
 * current mix and shaping through `renderComposite`, and hands the WAV to a
 * download or a Drive upload exactly as a recording's export does. It changes
 * no live state: it reads the mix it is given and writes only the file.
 */

const WAV_MIME_TYPE = 'audio/wav';
/** The share of the progress bar that is loading and preparing the stems. */
const PREPARE_SHARE = 0.3;

export type CompositeExportPlan = {
  /** The key the run's events carry (the composite's id). */
  exportId: string;
  fileName: string;
  stems: readonly CompositeExportStem[];
  shaping: CompositeRenderShaping;
  destination: ExportDestination;
  folder?: { folderId: string; folderName: string };
  /** Required for Drive; absent means the write permission is missing. */
  accessToken?: string;
  /** A Drive session from an earlier attempt, to continue from. */
  resumeUri?: string;
};

export type CompositeExportDependencies = Pick<
  ExportRunnerDependencies,
  'makeBlob' | 'saveToDevice' | 'upload'
> & {
  /** Loads a stem as a reader, preparing it first when it is not prepared. */
  loadStem: LoadStem;
  /** The rate stems are prepared at, and the file is written at. */
  sampleRate: number;
  createShaper: (sampleRate: number) => SumShaper;
};

type Dispatch = (event: ExportRunEvent) => void;

type Loaded =
  | { status: 'ready'; readers: ReadonlyMap<string, PcmWindowReader> }
  | { status: 'stopped' };

const loadStems = async (
  plan: CompositeExportPlan,
  deps: CompositeExportDependencies,
  dispatch: Dispatch,
  signal: AbortSignal,
): Promise<Loaded> => {
  const readers = new Map<string, PcmWindowReader>();
  const recordingId = plan.exportId;

  for (const [index, stem] of plan.stems.entries()) {
    if (signal.aborted) {
      return { status: 'stopped' };
    }

    try {
      readers.set(
        stem.id,
        await deps.loadStem({
          onProgress: (fraction) =>
            dispatch({
              progress:
                (PREPARE_SHARE * (index + fraction)) / plan.stems.length,
              recordingId,
              type: 'item-progress',
            }),
          signal,
          stemId: stem.id,
        }),
      );
    } catch (error) {
      if (signal.aborted) {
        return { status: 'stopped' };
      }

      dispatch({
        reason: isStorageFullError(error) ? 'no-room' : 'stem',
        recordingId,
        type: 'item-failed',
      });

      return { status: 'stopped' };
    }
  }

  return { readers, status: 'ready' };
};

export const runCompositeExport = async (
  plan: CompositeExportPlan,
  deps: CompositeExportDependencies,
  options: { signal: AbortSignal; dispatch: Dispatch },
): Promise<void> => {
  const { dispatch, signal } = options;
  const recordingId = plan.exportId;

  dispatch({ recordingId, status: 'rendering', type: 'item-started' });

  const loaded = await loadStems(plan, deps, dispatch, signal);

  if (loaded.status === 'stopped') {
    dispatch({ type: signal.aborted ? 'cancelled' : 'finished' });

    return;
  }

  const blocks: Int16Array[] = [];
  const result = await renderComposite({
    onProgress: (done, total) =>
      dispatch({
        progress: PREPARE_SHARE + (1 - PREPARE_SHARE) * (done / total),
        recordingId,
        type: 'item-progress',
      }),
    shaper: deps.createShaper(deps.sampleRate),
    shaping: plan.shaping,
    signal,
    stems: plan.stems.flatMap((stem) => {
      const reader = loaded.readers.get(stem.id);

      return reader
        ? [{ gain: stem.gain, id: stem.id, offsetMs: stem.offsetMs, reader }]
        : [];
    }),
    write: (samples) => {
      blocks.push(samples);
    },
  });

  if (result.status === 'failed') {
    dispatch({ reason: 'render', recordingId, type: 'item-failed' });
  } else if (result.status === 'done' && !signal.aborted) {
    await deliverExportFile(
      {
        fileName: plan.fileName,
        id: recordingId,
        resumeUri: plan.resumeUri,
      },
      deps.makeBlob(
        encodeWavParts(blocks, {
          channels: result.channels,
          sampleRate: result.sampleRate,
        }),
        WAV_MIME_TYPE,
      ),
      plan,
      deps,
      dispatch,
      signal,
    );
  }

  dispatch({ type: signal.aborted ? 'cancelled' : 'finished' });
};
