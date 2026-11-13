import { createAudioSessionArbiter } from './audio-session-arbiter';

type SessionScope = { navigator?: { audioSession?: { type: string } } };

/** The page's one audio session arbiter; where there is no session it does nothing. */
export const webAudioSession = createAudioSessionArbiter(
  () => (globalThis as unknown as SessionScope).navigator?.audioSession,
);
