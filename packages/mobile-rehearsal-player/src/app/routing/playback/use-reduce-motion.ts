import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the person asked the system for less motion (`prefers-reduced-motion`
 * on the web, which react-native-web reads through `AccessibilityInfo`; the
 * platform setting on native). It starts false until the setting is read, so
 * the first frame is never held back.
 */
export const useReduceMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};
