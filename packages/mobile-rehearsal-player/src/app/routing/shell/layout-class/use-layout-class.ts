import { useRef } from 'react';
import { useWindowDimensions } from 'react-native';

import { getLayoutClass, type LayoutClass } from './model';

/**
 * The layout class for the current window (see `getLayoutClass`). The class
 * in use is kept between renders so the hysteresis has something to compare
 * with; the window size itself is the only thing that makes it change.
 */
export const useLayoutClass = (): LayoutClass => {
  const { height, width } = useWindowDimensions();
  const previous = useRef<LayoutClass>('compact');
  const next = getLayoutClass({ height, width }, previous.current);

  previous.current = next;

  return next;
};
