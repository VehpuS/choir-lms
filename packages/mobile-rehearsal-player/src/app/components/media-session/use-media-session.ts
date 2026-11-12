import type { MediaSessionSnapshot } from './model';

export type MediaSessionCommand = 'next' | 'pause' | 'play' | 'previous';

type UseMediaSession = (options: {
  onCommand: (command: MediaSessionCommand) => void;
  snapshot: MediaSessionSnapshot;
}) => void;

// Native shows the lock screen and notification itself through
// `react-native-track-player`; the web version is `use-media-session.web.ts`.
export const useMediaSession: UseMediaSession = () => undefined;
