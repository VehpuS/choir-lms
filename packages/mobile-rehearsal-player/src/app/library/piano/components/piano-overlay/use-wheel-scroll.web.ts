import { useEffect, useRef, type RefObject } from 'react';
import type { View } from 'react-native';

import {
  attachWheelScroll,
  type WheelScrollHost,
} from './attach-wheel-scroll.web';

/** Scrolls by a wheel or trackpad gesture over `surfaceRef` (a DOM node on web). */
export const useWheelScroll = (
  surfaceRef: RefObject<View | null>,
  onScrollBy: (delta: number) => void,
) => {
  // The listener is attached once; it reads the latest handler from a ref.
  const latest = useRef(onScrollBy);

  latest.current = onScrollBy;

  useEffect(() => {
    const host = surfaceRef.current as unknown as WheelScrollHost | null;

    return host
      ? attachWheelScroll(host, (delta) => latest.current(delta))
      : undefined;
  }, [surfaceRef]);
};
