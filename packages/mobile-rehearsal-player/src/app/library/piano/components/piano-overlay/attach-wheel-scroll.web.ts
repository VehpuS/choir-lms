import { wheelScrollDelta } from '../../piano-overlay-model';

type WheelLike = {
  deltaX?: number;
  deltaY?: number;
  shiftKey?: boolean;
  preventDefault: () => void;
};

export type WheelScrollHost = {
  addEventListener: (
    type: 'wheel',
    listener: (event: WheelLike) => void,
    options: { passive: false },
  ) => void;
  removeEventListener: (
    type: 'wheel',
    listener: (event: WheelLike) => void,
  ) => void;
};

/**
 * Scrolls the keys from a horizontal wheel or trackpad gesture. The listener
 * is attached natively and non-passive: React registers its wheel handlers as
 * passive, which ignores `preventDefault` and lets the page scroll (or the
 * browser navigate back) along with the keys.
 */
export const attachWheelScroll = (
  host: WheelScrollHost,
  onScrollBy: (delta: number) => void,
): (() => void) => {
  const onWheel = (event: WheelLike) => {
    const delta = wheelScrollDelta(event);

    if (delta !== 0) {
      event.preventDefault();
      onScrollBy(delta);
    }
  };

  host.addEventListener('wheel', onWheel, { passive: false });

  return () => host.removeEventListener('wheel', onWheel);
};
