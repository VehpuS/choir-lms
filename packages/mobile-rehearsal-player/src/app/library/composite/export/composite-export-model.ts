import {
  formatRecordingSize,
  getStemStates,
  type CompositeMix,
  type CompositeTrack,
  type DriveAudioSource,
} from '@org/audio-library-models';
import {
  describeMix,
  estimateCompositeWavBytes,
  listMixPresets,
  planCompositeRender,
  resolveStemGains,
  type CompositeRenderShaping,
} from '@org/audio-mixing';

import { normalizeExportFileName } from '../../recording/export/recording-export-model';

/**
 * What the composite export dialog says and decides (composite-tracks 10.2,
 * design Decision 13): what is rendered, the estimated size and length, the
 * file name, and which stems are left out. Pure; the runner, the hook and the
 * sheet sit around it.
 */

export const COMPOSITE_EXPORT_COPY = {
  title: 'Export mix',
  fallbackFileName: 'Composite mix.wav',
  nameSeparator: ' · ',
  allMissing:
    'No stem of this composite is available, so there is nothing to export.',
} as const;

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SPEED_DECIMALS = 2;

const formatClock = (ms: number): string => {
  const totalSeconds = Math.round(ms / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** `0.7×`, `1×`: the speed without trailing zeros. */
const formatSpeed = (rate: number): string =>
  `${Number(rate.toFixed(SPEED_DECIMALS))}×`;

/** `+2 st`, `−3 st`, `0 st`. */
const formatPitch = (semitones: number): string => {
  if (semitones === 0) {
    return '0 st';
  }

  return `${semitones > 0 ? '+' : '−'}${Math.abs(semitones)} st`;
};

export const describeShaping = (shaping: CompositeRenderShaping): string =>
  `${formatSpeed(shaping.rate)} · ${formatPitch(shaping.pitchSemitones)}`;

const joinNames = (names: readonly string[]): string => {
  if (names.length <= 1) {
    return names.join('');
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

type ExportComposite = Pick<
  CompositeTrack,
  'id' | 'name' | 'stems' | 'presets'
>;
type ExportTrack = Pick<DriveAudioSource, 'id' | 'availability' | 'durationMs'>;

export type CompositeExportStem = {
  id: string;
  offsetMs: number;
  /** Linear gain with mute and solo resolved. */
  gain: number;
};

export type CompositeExportModel = {
  /** The name of the mix being exported (`Without Bass`, `Custom mix`). */
  mixName: string;
  defaultFileName: string;
  /** What is rendered: the current mix and shaping, as a 16-bit WAV. */
  description: string;
  /** The stems that are rendered, with their resolved gains. */
  stems: CompositeExportStem[];
  /** The stems left out because their track is gone or unavailable. */
  missingStemNames: string[];
  /** `Alto and Bass are not included: their tracks are not available.` */
  missingNote: string | undefined;
  /** The exported length; undefined while a track's length is unknown. */
  durationMs: number | undefined;
  /** `About 18 MB · 3:25.` */
  estimateLabel: string | undefined;
  canExport: boolean;
};

export const buildCompositeExportModel = (input: {
  composite: ExportComposite;
  tracks: ReadonlyMap<string, ExportTrack>;
  mix: CompositeMix;
  shaping: CompositeRenderShaping;
  /** The output rate the size is estimated at (the audio context's). */
  sampleRate: number;
}): CompositeExportModel => {
  const { composite, mix, shaping, tracks } = input;
  const states = new Map(
    getStemStates(composite.stems, tracks).map((entry) => [
      entry.stemId,
      entry.state,
    ]),
  );
  const included = composite.stems.filter(
    (stem) => states.get(stem.id) !== 'missing',
  );
  const missing = composite.stems.filter(
    (stem) => states.get(stem.id) === 'missing',
  );
  const gains = resolveStemGains(included, mix);
  const mixName = describeMix(composite.stems, mix, listMixPresets(composite));
  const durations = included.map(
    (stem) => tracks.get(stem.trackId)?.durationMs,
  );
  const hasUnknownLength = durations.some((ms) => ms === undefined);
  const plan = hasUnknownLength
    ? undefined
    : planCompositeRender(
        included.map((stem, index) => ({
          offsetMs: stem.offsetMs,
          durationMs: durations[index] ?? 0,
        })),
        shaping,
        input.sampleRate,
      );
  const missingNames = missing.map((stem) => stem.name);

  return {
    mixName,
    defaultFileName: normalizeExportFileName(
      `${composite.name}${COMPOSITE_EXPORT_COPY.nameSeparator}${mixName}`,
      COMPOSITE_EXPORT_COPY.fallbackFileName,
    ),
    description: `Renders the mix as it is now (${mixName}, ${describeShaping(shaping)}) as a 16-bit WAV.`,
    stems: included.map((stem) => ({
      id: stem.id,
      offsetMs: stem.offsetMs,
      gain: gains[stem.id] ?? 0,
    })),
    missingStemNames: missingNames,
    missingNote:
      missingNames.length === 0
        ? undefined
        : `${joinNames(missingNames)} ${missingNames.length === 1 ? 'is' : 'are'} not included: ${missingNames.length === 1 ? 'its track is' : 'their tracks are'} not available.`,
    durationMs: plan?.outputDurationMs,
    estimateLabel: plan
      ? `About ${formatRecordingSize(estimateCompositeWavBytes(plan))} · ${formatClock(plan.outputDurationMs)}.`
      : undefined,
    canExport: included.length > 0,
  };
};
