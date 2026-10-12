import { useEffect, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle, type View } from 'react-native';

// Moves screen-reader focus into an overlay that has just opened, so it does
// not stay on the page underneath. The web version is `use-focus-on-mount.web.ts`.
export const useFocusOnMount = (ref: RefObject<View | null>) => {
  useEffect(() => {
    const handle = ref.current ? findNodeHandle(ref.current) : null;

    if (handle !== null) {
      AccessibilityInfo.setAccessibilityFocus(handle);
    }
  }, [ref]);
};
