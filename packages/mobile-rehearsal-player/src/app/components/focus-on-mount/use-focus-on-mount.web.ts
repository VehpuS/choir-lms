import { useEffect, type RefObject } from 'react';
import type { View } from 'react-native';

type FocusableElement = { focus?: () => void };

// Moves keyboard and screen-reader focus into an overlay that has just
// opened, so it does not stay on the page underneath. On react-native-web a
// `View` ref is the DOM element, which needs `tabIndex={-1}` to take focus.
export const useFocusOnMount = (ref: RefObject<View | null>) => {
  useEffect(() => {
    (ref.current as unknown as FocusableElement | null)?.focus?.();
  }, [ref]);
};
