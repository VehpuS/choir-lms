import { useEffect, useRef } from 'react';

/** A press held this long on empty waveform adds a marker instead of scrubbing. */
export const WAVEFORM_LONG_PRESS_MS = 500;
/** Finger travel that turns a press into a scrub, so it is no longer a long press. */
export const WAVEFORM_LONG_PRESS_MOVE_TOLERANCE = 8;

/**
 * Long press on the waveform: starts on touch down, is cancelled by travel or
 * release, and reports whether it fired so the release does not also scrub.
 */
export const useWaveformLongPress = (options: {
  /** Called when the press is held; without it nothing is ever armed. */
  onLongPress?: (locationX: number) => void;
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originXRef = useRef(0);
  const hasFiredRef = useRef(false);
  const onLongPressRef = useRef(options.onLongPress);

  onLongPressRef.current = options.onLongPress;

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => cancel, []);

  const start = (locationX: number) => {
    hasFiredRef.current = false;
    originXRef.current = locationX;
    cancel();

    if (!onLongPressRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      hasFiredRef.current = true;
      onLongPressRef.current?.(originXRef.current);
    }, WAVEFORM_LONG_PRESS_MS);
  };

  const move = (locationX: number) => {
    if (
      Math.abs(locationX - originXRef.current) >
      WAVEFORM_LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancel();
    }
  };

  /** Whether the press just ended was a long press (and clears that). */
  const consumeFired = () => {
    cancel();

    const hasFired = hasFiredRef.current;

    hasFiredRef.current = false;

    return hasFired;
  };

  return {
    cancel,
    hasFired: () => hasFiredRef.current,
    consumeFired,
    move,
    start,
  };
};
