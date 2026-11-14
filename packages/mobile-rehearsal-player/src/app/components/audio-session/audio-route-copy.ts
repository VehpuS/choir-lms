import type { AudioRoute } from './audio-session-arbiter';

export const AUDIO_ROUTE_COPY = {
  body: 'Experimental. While the microphone is on, iOS may move Bluetooth earbuds to a thin, phone-call sound. These change what the app asks iOS for; try each and keep the one that sounds best. Takes effect the next time the microphone starts.',
  title: 'Sound while listening',
} as const;

export const AUDIO_ROUTE_ROWS: ReadonlyArray<{
  label: string;
  value: AudioRoute;
}> = [
  { label: 'Play and record (default)', value: 'play-and-record' },
  { label: 'Automatic (the browser decides)', value: 'auto' },
  { label: 'Playback once the microphone is on', value: 'playback-after-open' },
];
