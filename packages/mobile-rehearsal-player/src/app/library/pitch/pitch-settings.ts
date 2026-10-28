import {
  clampLevelCutoffDb,
  DEFAULT_LEVEL_CUTOFF_DB,
} from '@org/pitch-detection';

import type { PitchFlagStorage } from './pitch-store-types';

export const PITCH_LEVEL_CUTOFF_KEY = 'choirlms.pitch.levelCutoffDb';
/** The retired Low / Normal / High choice; read once to carry it over. */
export const PITCH_LEGACY_SENSITIVITY_KEY = 'choirlms.pitch.sensitivity';
export const PITCH_SHOW_OTHER_OCTAVE_KEY = 'choirlms.pitch.showOtherOctave';

/** What each retired preset meant, so nobody loses the choice they made. */
const LEGACY_SENSITIVITY_CUTOFF_DB: Record<string, number> = {
  low: -34,
  normal: -40,
  high: -48,
};
const TRUE_VALUE = 'true';
const FALSE_VALUE = 'false';

export type PitchSettings = {
  /** Sounds quieter than this (dBFS) are ignored. */
  levelCutoffDb: number;
  /** Whether the score also marks the same note in another octave. */
  showOtherOctave: boolean;
};

export const DEFAULT_PITCH_SETTINGS: PitchSettings = {
  levelCutoffDb: DEFAULT_LEVEL_CUTOFF_DB,
  showOtherOctave: false,
};

/** Raw stored strings; anything may be missing or odd. */
export type RawPitchSettings = {
  levelCutoffDb?: string | null;
  legacySensitivity?: string | null;
  showOtherOctave?: string | null;
};

const parseLevelCutoffDb = (raw: RawPitchSettings): number => {
  const stored =
    raw.levelCutoffDb === null || raw.levelCutoffDb === undefined
      ? Number.NaN
      : Number(raw.levelCutoffDb);

  if (Number.isFinite(stored)) {
    return clampLevelCutoffDb(stored);
  }

  return (
    LEGACY_SENSITIVITY_CUTOFF_DB[raw.legacySensitivity ?? ''] ??
    DEFAULT_PITCH_SETTINGS.levelCutoffDb
  );
};

/** Parses where the values enter the app, so garbage falls back to defaults. */
export const parsePitchSettings = (raw: RawPitchSettings): PitchSettings => {
  return {
    levelCutoffDb: parseLevelCutoffDb(raw),
    showOtherOctave: raw.showOtherOctave === TRUE_VALUE,
  };
};

export type PitchSettingsStore = {
  get: () => PitchSettings;
  set: (patch: Partial<PitchSettings>) => void;
  subscribe: (listener: () => void) => () => void;
  /** Reads the stored values once and publishes them; safe to call again. */
  load: () => Promise<PitchSettings>;
};

/**
 * The pitch settings kept on the device: minimum volume (edited in the Pitch
 * view) and `Show other-octave matches` (edited only from the viewer's
 * Practice tools menu). Each value stands alone, so one survives while the
 * control for the other is out of sight. Nothing about sound is stored.
 */
export const createPitchSettingsStore = (
  storage: PitchFlagStorage,
): PitchSettingsStore => {
  const listeners = new Set<() => void>();
  const chosen = new Set<keyof PitchSettings>();
  let current = DEFAULT_PITCH_SETTINGS;
  let loading: Promise<PitchSettings> | null = null;

  const publish = (next: PitchSettings) => {
    current = next;
    listeners.forEach((listener) => listener());
  };

  const load = () => {
    loading ??= Promise.all([
      storage.getItem(PITCH_LEVEL_CUTOFF_KEY),
      storage.getItem(PITCH_LEGACY_SENSITIVITY_KEY),
      storage.getItem(PITCH_SHOW_OTHER_OCTAVE_KEY),
    ])
      .then(([levelCutoffDb, legacySensitivity, showOtherOctave]) => {
        const stored = parsePitchSettings({
          levelCutoffDb,
          legacySensitivity,
          showOtherOctave,
        });

        // Carry an old preset over once by saving it under the new key.
        if (levelCutoffDb === null && legacySensitivity !== null) {
          void storage
            .setItem(PITCH_LEVEL_CUTOFF_KEY, String(stored.levelCutoffDb))
            .catch(() => undefined);
        }

        // A choice made before the stored values arrived wins over them.
        publish({
          levelCutoffDb: chosen.has('levelCutoffDb')
            ? current.levelCutoffDb
            : stored.levelCutoffDb,
          showOtherOctave: chosen.has('showOtherOctave')
            ? current.showOtherOctave
            : stored.showOtherOctave,
        });

        return current;
      })
      .catch(() => current);

    return loading;
  };

  return {
    get: () => current,
    set: (patch) => {
      (Object.keys(patch) as (keyof PitchSettings)[]).forEach((key) =>
        chosen.add(key),
      );
      const levelCutoffDb =
        patch.levelCutoffDb === undefined
          ? undefined
          : clampLevelCutoffDb(patch.levelCutoffDb);

      publish({
        ...current,
        ...patch,
        levelCutoffDb: levelCutoffDb ?? current.levelCutoffDb,
      });

      if (levelCutoffDb !== undefined) {
        void storage
          .setItem(PITCH_LEVEL_CUTOFF_KEY, String(levelCutoffDb))
          .catch(() => undefined);
      }

      if (patch.showOtherOctave !== undefined) {
        void storage
          .setItem(
            PITCH_SHOW_OTHER_OCTAVE_KEY,
            patch.showOtherOctave ? TRUE_VALUE : FALSE_VALUE,
          )
          .catch(() => undefined);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      void load();

      return () => {
        listeners.delete(listener);
      };
    },
    load,
  };
};
