import { useEffect } from 'react';
import { BackHandler } from 'react-native';

type UseEscapeToDismiss = (isActive: boolean, onDismiss: () => void) => void;

// Native has no hardware Escape key; the Android back button is its dismiss
// gesture, so an open popover or overlay closes on back instead of leaving the
// app. iOS has no such button, so there the control and scrim are the only
// way out. The web version lives in `use-escape-to-dismiss.web.ts`.
export const useEscapeToDismiss: UseEscapeToDismiss = (isActive, onDismiss) => {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onDismiss();

        return true;
      },
    );

    return () => subscription.remove();
  }, [isActive, onDismiss]);
};
