import {
  clampStemVolume,
  getStemStates,
  type CompositeMix,
  type CompositeTrack,
  type DriveAudioSource,
} from '@org/audio-library-models';
import {
  describeMix,
  getStemLevel,
  listMixPresets,
  resolveStemGains,
} from '@org/audio-mixing';

/**
 * What the Mix panel shows (composite-tracks design Decisions 7 and 10): the
 * summary line, the preset name and a row per stem. Pure; the views and the
 * session store sit around it.
 */

export const MIX_PANEL_TITLE = 'Mix';
export const YOUR_PART_LABEL = 'Your part';
export const STEM_MISSING_LABEL = 'Stem missing';
export const STEM_MISSING_HINT = 'Not in Drive or on this device';
export const RELINK_LABEL = 'Re-link';
export const REMOVE_LABEL = 'Remove';
export const MAX_VOLUME_PERCENT = 150;
const SUMMARY_SEPARATOR = ' · ';

export type MixPanelRow = {
  stemId: string;
  name: string;
  isMine: boolean;
  isMissing: boolean;
  /** Silent because of the mix (muted, or not soloed while another is). */
  isSilent: boolean;
  isMuted: boolean;
  isSoloed: boolean;
  volume: number;
  volumeLabel: string;
};

export type MixPanelModel = {
  summary: string;
  presetName: string;
  rows: MixPanelRow[];
};

type PanelComposite = Pick<CompositeTrack, 'stems' | 'presets'>;

export const formatVolumeLabel = (volume: number): string =>
  `${Math.round(clampStemVolume(volume))}%`;

export const buildMixPanelModel = (input: {
  composite: PanelComposite;
  mix: CompositeMix;
  /** The library's tracks; a stem whose track is gone or unavailable is missing. */
  library: ReadonlyMap<string, Pick<DriveAudioSource, 'id' | 'availability'>>;
}): MixPanelModel => {
  const { composite, mix, library } = input;
  const states = new Map(
    getStemStates(composite.stems, library).map((entry) => [
      entry.stemId,
      entry.state,
    ]),
  );
  const gains = resolveStemGains(composite.stems, mix);
  const presetName = describeMix(
    composite.stems,
    mix,
    listMixPresets(composite),
  );
  const rows = composite.stems.map((stem): MixPanelRow => {
    const level = getStemLevel(mix, stem.id);

    return {
      stemId: stem.id,
      name: stem.name,
      isMine: stem.mine,
      isMissing: states.get(stem.id) === 'missing',
      isSilent: gains[stem.id] === 0,
      isMuted: level.muted,
      isSoloed: level.soloed,
      volume: clampStemVolume(level.volume),
      volumeLabel: formatVolumeLabel(level.volume),
    };
  });
  // A missing stem does not sound whatever the mix says.
  const sounding = rows.filter((row) => !row.isMissing && !row.isSilent).length;

  return {
    summary: [
      presetName,
      `${sounding} of ${composite.stems.length} sounding`,
    ].join(SUMMARY_SEPARATOR),
    presetName,
    rows,
  };
};
