import type { Sensitivity } from '@org/pitch-detection';

import type { PitchFlagStorage } from './pitch-store-types';

export const PITCH_SENSITIVITY_KEY = 'choirlms.pitch.sensitivity';
export const PITCH_SHOW_OTHER_OCTAVE_KEY = 'choirlms.pitch.showOtherOctave';

const SENSITIVITY_VALUES: readonly Sensitivity[] = ['low', 'normal', 'high'];
const TRUE_VALUE = 'true';
const FALSE_VALUE = 'false';

export type PitchSettings = {
  sensitivity: Sensitivity;
  /** Whether the score also marks the same note in another octave. */
  showOtherOctave: boolean;
};

export const DEFAULT_PITCH_SETTINGS: PitchSettings = {
  sensitivity: 'normal',
  showOtherOctave: false,
};

/** Raw stored strings; anything may be missing or odd. */
export type RawPitchSettings = {
  sensitivity?: string | null;
  showOtherOctave?: string | null;
};

/** Parses where the values enter the app, so garbage falls back to defaults. */
export const parsePitchSettings = (raw: RawPitchSettings): PitchSettings => {
  const sensitivity = SENSITIVITY_VALUES.find(
    (value) => value === raw.sensitivity,
  );

  return {
    sensitivity: sensitivity ?? DEFAULT_PITCH_SETTINGS.sensitivity,
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
 * The pitch settings kept on the device: sensitivity (edited in the Pitch
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
      storage.getItem(PITCH_SENSITIVITY_KEY),
      storage.getItem(PITCH_SHOW_OTHER_OCTAVE_KEY),
    ])
      .then(([sensitivity, showOtherOctave]) => {
        const stored = parsePitchSettings({ sensitivity, showOtherOctave });

        // A choice made before the stored values arrived wins over them.
        publish({
          sensitivity: chosen.has('sensitivity')
            ? current.sensitivity
            : stored.sensitivity,
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
      publish({ ...current, ...patch });

      if (patch.sensitivity !== undefined) {
        void storage
          .setItem(PITCH_SENSITIVITY_KEY, patch.sensitivity)
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
