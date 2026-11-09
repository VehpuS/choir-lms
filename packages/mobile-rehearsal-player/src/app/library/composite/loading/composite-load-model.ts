import {
  getOverallLoadFraction,
  type StemLoadProgress,
} from './composite-stem-loader';
import type { CompositeLoadPhase } from './composite-load-state';

/**
 * The words and numbers of the loading state on the playback screen (the
 * design mock's `Loading` and `Preparing` screens). Pure; the view sits around it.
 */

export const LOADING_HINT =
  'Playback starts when every stem is ready, so the mix never changes while you sing.';
export const PREPARING_HINT =
  'The first play takes longer because the stems are prepared. They are kept on this device, and next time it opens quickly.';

export type LoadingRow = {
  stemId: string;
  name: string;
  statusLabel: string;
  isReady: boolean;
};

export type CompositeLoadingModel = {
  subtitle: string;
  progressFraction: number;
  /** `Preparing Tenor…` while preparing; null otherwise. */
  currentLabel: string | null;
  counter: string;
  rows: LoadingRow[];
  hint: string;
};

const STATUS_LABELS: Record<StemLoadProgress['status'], string> = {
  ready: 'ready',
  loading: 'loading…',
  waiting: 'waiting',
  failed: 'could not load',
};

export const buildCompositeLoadingModel = (input: {
  phase: CompositeLoadPhase;
  stems: readonly StemLoadProgress[];
  /** Stem names by id; a stem the record no longer has is left out. */
  names: ReadonlyMap<string, string>;
}): CompositeLoadingModel => {
  const { names, phase, stems } = input;
  const rows = stems.flatMap((entry): LoadingRow[] => {
    const name = names.get(entry.stemId);

    return name === undefined
      ? []
      : [
          {
            stemId: entry.stemId,
            name,
            statusLabel: STATUS_LABELS[entry.status],
            isReady: entry.status === 'ready',
          },
        ];
  });
  const total = stems.length;
  const done = stems.filter(
    (entry) => entry.status === 'ready' || entry.status === 'failed',
  ).length;
  const ready = stems.filter((entry) => entry.status === 'ready').length;
  const working = stems.find((entry) => entry.status === 'loading');
  const workingName = working ? names.get(working.stemId) : undefined;

  if (phase === 'preparing') {
    return {
      subtitle: `Preparing stems · ${done} of ${total} · first time only`,
      progressFraction: getOverallLoadFraction(stems),
      currentLabel: workingName ? `Preparing ${workingName}…` : null,
      counter: `${done} of ${total}`,
      rows,
      hint: PREPARING_HINT,
    };
  }

  return {
    subtitle: `Loading stems · ${ready} of ${total} ready`,
    progressFraction: getOverallLoadFraction(stems),
    currentLabel: null,
    counter: `${ready} of ${total}`,
    rows,
    hint: LOADING_HINT,
  };
};
