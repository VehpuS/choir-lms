import { createContext, useContext, useRef } from 'react';
import { useWindowDimensions } from 'react-native';

import { getLayoutClass, type LayoutClass } from './model';

/**
 * Measures the window and returns its layout class (see `getLayoutClass`). The
 * class in use is kept between renders so the hysteresis has something to
 * compare with; the window size itself is the only thing that makes it
 * change. Only the shell calls this; everything below reads the shell's answer
 * with `useLayoutClass`, so the whole tree agrees even inside the band.
 */
export const useWindowLayoutClass = (): LayoutClass => {
  const { height, width } = useWindowDimensions();
  const previous = useRef<LayoutClass>('compact');
  const next = getLayoutClass({ height, width }, previous.current);

  previous.current = next;

  return next;
};

const LayoutClassContext = createContext<LayoutClass>('compact');

export const LayoutClassProvider = LayoutClassContext.Provider;

/** The layout class the shell chose; `compact` outside a shell. */
export const useLayoutClass = (): LayoutClass => {
  return useContext(LayoutClassContext);
};
