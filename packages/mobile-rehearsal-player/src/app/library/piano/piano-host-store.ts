import { useSyncExternalStore } from 'react';

// The sheet music viewer is a full-screen `Modal` that paints above the
// shell, so it mounts its own docked piano. While it is open the shell's
// instance hides, so there is one keyboard on screen and one set of listeners
// (design Decision 1).
let viewerCount = 0;
const listeners = new Set<() => void>();

const publish = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const registerPianoViewer = (): (() => void) => {
  viewerCount += 1;
  publish();

  return () => {
    viewerCount -= 1;
    publish();
  };
};

export const isPianoViewerOpen = () => viewerCount > 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useIsPianoViewerOpen = (): boolean => {
  return useSyncExternalStore(subscribe, isPianoViewerOpen);
};
