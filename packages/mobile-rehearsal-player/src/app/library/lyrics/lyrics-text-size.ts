import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { appTheme } from '../../utils/theme';

type LyricsTextSizeStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export type LyricsTextSize = 'small' | 'medium' | 'large' | 'extra-large';

export const LYRICS_TEXT_SIZES: readonly LyricsTextSize[] = [
  'small',
  'medium',
  'large',
  'extra-large',
];
export const DEFAULT_LYRICS_TEXT_SIZE: LyricsTextSize = 'medium';
export const LYRICS_TEXT_SIZE_KEY = 'choirlms.lyrics.text-size';

export const LYRICS_TEXT_SIZE_LABELS: Record<LyricsTextSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  'extra-large': 'Extra large',
};

export const parseLyricsTextSize = (value: unknown): LyricsTextSize => {
  return (
    LYRICS_TEXT_SIZES.find((size) => size === value) ?? DEFAULT_LYRICS_TEXT_SIZE
  );
};

/** The theme's type token for a text-size step. */
export const resolveLyricsTextStyle = (size: LyricsTextSize) => {
  const { lyrics } = appTheme.type;

  return size === 'extra-large' ? lyrics.extraLarge : lyrics[size];
};

export const restoreLyricsTextSize = async (
  storage: LyricsTextSizeStorage = AsyncStorage,
): Promise<LyricsTextSize> => {
  try {
    return parseLyricsTextSize(await storage.getItem(LYRICS_TEXT_SIZE_KEY));
  } catch {
    return DEFAULT_LYRICS_TEXT_SIZE;
  }
};

export const persistLyricsTextSize = async (
  size: LyricsTextSize,
  storage: LyricsTextSizeStorage = AsyncStorage,
): Promise<void> => {
  try {
    await storage.setItem(LYRICS_TEXT_SIZE_KEY, size);
  } catch {
    // The choice still applies for this session.
  }
};

// One device-wide preference shared by the playback section, the peek, and
// reading mode, so a change on one surface shows on the others at once.
let currentSize: LyricsTextSize = DEFAULT_LYRICS_TEXT_SIZE;
let hasRestored = false;
const listeners = new Set<() => void>();

const publish = (size: LyricsTextSize) => {
  currentSize = size;
  listeners.forEach((listener) => {
    listener();
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  if (!hasRestored) {
    hasRestored = true;
    void restoreLyricsTextSize().then(publish);
  }

  return () => {
    listeners.delete(listener);
  };
};

export const setLyricsTextSize = (size: LyricsTextSize) => {
  publish(size);
  void persistLyricsTextSize(size);
};

export const useLyricsTextSize = (): LyricsTextSize => {
  return useSyncExternalStore(subscribe, () => currentSize);
};

/** One step larger or smaller, stopping at the ends. */
export const stepLyricsTextSize = (
  size: LyricsTextSize,
  direction: 'larger' | 'smaller',
): LyricsTextSize => {
  const index = LYRICS_TEXT_SIZES.indexOf(size);
  const next = index + (direction === 'larger' ? 1 : -1);

  return LYRICS_TEXT_SIZES[
    Math.min(Math.max(next, 0), LYRICS_TEXT_SIZES.length - 1)
  ];
};
