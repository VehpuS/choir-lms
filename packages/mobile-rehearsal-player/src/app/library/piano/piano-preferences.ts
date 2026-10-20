import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { Accidentals } from '@org/audio-library-models';

import { PIANO_HEIGHT_STEPS, type PianoHeightStep } from './keyboard-layout';

type PianoStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export type PianoSound = 'piano' | 'organ';
export const PIANO_SOUNDS: readonly PianoSound[] = ['piano', 'organ'];
export const PIANO_SOUND_LABELS: Record<PianoSound, string> = {
  piano: 'Piano',
  organ: 'Organ',
};
export const PIANO_ACCIDENTALS: readonly Accidentals[] = ['sharps', 'flats'];
export const PIANO_ACCIDENTAL_LABELS: Record<Accidentals, string> = {
  sharps: 'Sharps',
  flats: 'Flats',
};

export type PianoPreferences = {
  sound: PianoSound;
  /** 0–1, the piano alone; the track's volume is never touched. */
  volume: number;
  accidentals: Accidentals;
  showAllNoteNames: boolean;
  isOpen: boolean;
  heightStep: PianoHeightStep;
  scrollLeft: number;
};

export const DEFAULT_PIANO_PREFERENCES: PianoPreferences = {
  sound: 'piano',
  volume: 0.7,
  accidentals: 'sharps',
  showAllNoteNames: false,
  isOpen: false,
  heightStep: 'regular',
  scrollLeft: 0,
};

const PIANO_KEY_PREFIX = 'choirlms.piano.';
export const pianoStorageKey = (field: keyof PianoPreferences) => {
  return `${PIANO_KEY_PREFIX}${field}`;
};

const TRUE_VALUE = 'true';
const SCROLL_PERSIST_DELAY_MS = 300;

const parseNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : null;
};

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (value === TRUE_VALUE) {
    return true;
  }

  return value === 'false' ? false : fallback;
};

/** Raw stored strings, keyed by preference; anything may be missing or odd. */
export type RawPianoPreferences = Partial<
  Record<keyof PianoPreferences, unknown>
>;

/**
 * Parses and clamps stored values where they enter the app, so an unknown
 * sound, an out-of-range volume, or garbage falls back to a safe default.
 */
export const parsePianoPreferences = (
  raw: RawPianoPreferences,
): PianoPreferences => {
  const defaults = DEFAULT_PIANO_PREFERENCES;
  const volume = parseNumber(raw.volume);
  const scrollLeft = parseNumber(raw.scrollLeft);

  return {
    sound: PIANO_SOUNDS.find((sound) => sound === raw.sound) ?? defaults.sound,
    volume:
      volume === null ? defaults.volume : Math.min(Math.max(volume, 0), 1),
    accidentals:
      PIANO_ACCIDENTALS.find((value) => value === raw.accidentals) ??
      defaults.accidentals,
    showAllNoteNames: parseBoolean(
      raw.showAllNoteNames,
      defaults.showAllNoteNames,
    ),
    isOpen: parseBoolean(raw.isOpen, defaults.isOpen),
    heightStep:
      PIANO_HEIGHT_STEPS.find((step) => step === raw.heightStep) ??
      defaults.heightStep,
    scrollLeft:
      scrollLeft === null ? defaults.scrollLeft : Math.max(scrollLeft, 0),
  };
};

const PREFERENCE_FIELDS = Object.keys(
  DEFAULT_PIANO_PREFERENCES,
) as (keyof PianoPreferences)[];

export const restorePianoPreferences = async (
  storage: PianoStorage = AsyncStorage,
): Promise<PianoPreferences> => {
  try {
    const values = await Promise.all(
      PREFERENCE_FIELDS.map((field) => storage.getItem(pianoStorageKey(field))),
    );
    const raw: RawPianoPreferences = {};

    PREFERENCE_FIELDS.forEach((field, index) => {
      raw[field] = values[index];
    });

    return parsePianoPreferences(raw);
  } catch {
    return DEFAULT_PIANO_PREFERENCES;
  }
};

export const persistPianoPreferences = async (
  patch: Partial<PianoPreferences>,
  storage: PianoStorage = AsyncStorage,
): Promise<void> => {
  try {
    await Promise.all(
      (Object.keys(patch) as (keyof PianoPreferences)[]).map((field) =>
        storage.setItem(pianoStorageKey(field), String(patch[field])),
      ),
    );
  } catch {
    // The choice still applies for this session.
  }
};

// One device-wide store shared by the shell's overlay, the viewer's docked
// overlay, and Settings, so a change on one surface shows on the others.
let current: PianoPreferences = DEFAULT_PIANO_PREFERENCES;
let hasRestored = false;
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const publish = (next: PianoPreferences) => {
  current = next;
  listeners.forEach((listener) => {
    listener();
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  if (!hasRestored) {
    hasRestored = true;
    void restorePianoPreferences().then(publish);
  }

  return () => {
    listeners.delete(listener);
  };
};

export const getPianoPreferences = (): PianoPreferences => current;

export const setPianoPreferences = (patch: Partial<PianoPreferences>) => {
  publish({ ...current, ...patch });
  void persistPianoPreferences(patch);
};

/** Scrolling fires constantly, so only the resting position is written. */
export const setPianoScrollLeft = (scrollLeft: number) => {
  publish({ ...current, scrollLeft });

  if (scrollTimer) {
    clearTimeout(scrollTimer);
  }

  scrollTimer = setTimeout(() => {
    scrollTimer = null;
    void persistPianoPreferences({ scrollLeft: current.scrollLeft });
  }, SCROLL_PERSIST_DELAY_MS);
};

export const usePianoPreferences = (): PianoPreferences => {
  return useSyncExternalStore(subscribe, getPianoPreferences);
};
