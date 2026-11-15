import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { DEFAULT_AUDIO_ROUTE, type AudioRoute } from './audio-session-arbiter';

// The audio route is a Settings experiment (Microphone page). One live copy,
// read by the microphone source when it opens and by the Settings page.

export const AUDIO_ROUTE_KEY = 'choirlms.audio.route-while-listening';
export const AUDIO_ROUTES: readonly AudioRoute[] = [
  'play-and-record',
  'auto',
  'playback-after-open',
];

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
type Listener = () => void;

export const parseAudioRoute = (stored: string | null): AudioRoute => {
  return AUDIO_ROUTES.find((route) => route === stored) ?? DEFAULT_AUDIO_ROUTE;
};

export const createAudioRouteStore = (storage: Storage = AsyncStorage) => {
  let current: AudioRoute = DEFAULT_AUDIO_ROUTE;
  let hydration: Promise<AudioRoute> | null = null;
  const listeners = new Set<Listener>();
  const publish = (next: AudioRoute) => {
    current = next;
    listeners.forEach((listener) => {
      listener();
    });
  };

  const hydrate = () => {
    hydration ??= storage
      .getItem(AUDIO_ROUTE_KEY)
      .then(parseAudioRoute, () => DEFAULT_AUDIO_ROUTE)
      .then((route) => {
        publish(route);

        return route;
      });

    return hydration;
  };

  return {
    getSnapshot: () => current,
    hydrate,
    set: async (route: AudioRoute) => {
      // A change before the first read must not be overwritten by it.
      await hydrate();
      publish(route);
      await storage.setItem(AUDIO_ROUTE_KEY, route).catch(() => undefined);
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const audioRouteStore = createAudioRouteStore();

export const useAudioRoute = () => {
  const route = useSyncExternalStore(
    audioRouteStore.subscribe,
    audioRouteStore.getSnapshot,
  );

  void audioRouteStore.hydrate();

  return route;
};
