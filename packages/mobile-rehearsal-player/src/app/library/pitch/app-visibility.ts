import { AppState } from 'react-native';

export type VisibilitySource = {
  isVisible: () => boolean;
  /** Calls back with the new visibility; returns the unsubscribe. */
  subscribe: (listener: (visible: boolean) => void) => () => void;
};

/**
 * Visible means not in the background: an app beside another in split view
 * is `inactive` on some platforms and keeps listening. On web this follows
 * the page's visibility (a hidden tab or a locked screen is background).
 */
const isVisibleState = (state: string) => state !== 'background';

export const appVisibility: VisibilitySource = {
  isVisible: () => isVisibleState(AppState.currentState),
  subscribe: (listener) => {
    const subscription = AppState.addEventListener('change', (state) => {
      listener(isVisibleState(state));
    });

    return () => subscription.remove();
  },
};
