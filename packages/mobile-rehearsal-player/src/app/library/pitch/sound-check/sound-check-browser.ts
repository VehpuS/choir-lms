import { webAudioSession } from '../../../components/audio-session/web-audio-session';
import {
  getCompositeAudioContext,
  peekCompositeAudioContext,
} from '../../composite/engine/create-web-composite-engine';
import { getPcmSource } from '../pcm-source';
import {
  createSoundCheck,
  type SoundCheck,
  type SoundContextLike,
} from './sound-check-player';

type Scope = {
  AudioContext?: new () => SoundContextLike;
  Audio?: new (url: string) => {
    loop: boolean;
    paused: boolean;
    play: () => Promise<void>;
    pause: () => void;
  };
  Blob?: new (parts: unknown[], options: { type: string }) => unknown;
  URL?: {
    createObjectURL: (blob: unknown) => string;
    revokeObjectURL: (url: string) => void;
  };
  navigator?: { audioSession?: { type: string } };
};

const browser = () => globalThis as unknown as Scope;

let soundCheck: SoundCheck | null = null;

/** The page's Sound check, wired to the browser; one per page. */
export const getSoundCheck = (): SoundCheck => {
  soundCheck ??= createSoundCheck({
    createContext: () => {
      const { AudioContext: Constructor } = browser();

      return Constructor ? new Constructor() : null;
    },
    getAppContext: () =>
      peekCompositeAudioContext() as unknown as SoundContextLike | null,
    ensureAppContext: () =>
      getCompositeAudioContext() as unknown as SoundContextLike | null,
    createElement: (wav) => {
      const { Audio, Blob: BlobConstructor, URL: Urls } = browser();

      if (!Audio || !BlobConstructor || !Urls) {
        return null;
      }

      const url = Urls.createObjectURL(
        new BlobConstructor([wav], { type: 'audio/wav' }),
      );

      return {
        element: new Audio(url),
        release: () => Urls.revokeObjectURL(url),
      };
    },
    getSessionType: () => browser().navigator?.audioSession?.type ?? null,
    setSessionType: (type) => {
      const session = browser().navigator?.audioSession;

      if (session) {
        try {
          session.type = type;
        } catch {
          // A browser that refuses the type; the readout shows what it kept.
        }
      }
    },
    isCapturing: () => webAudioSession.isCapturing(),
    microphone: getPcmSource(),
  });

  return soundCheck;
};
