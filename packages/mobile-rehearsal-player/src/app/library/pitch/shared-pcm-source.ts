import type {
  PcmFrame,
  PcmPermission,
  PcmSource,
  PcmSubscriber,
} from './pcm-source-types';

/** What an opened microphone calls back into. */
export type PcmEmitter = {
  frame: (frame: PcmFrame) => void;
  interrupted: () => void;
  recovered: () => void;
  /** The platform closed the stream; every subscriber must resubscribe. */
  ended: () => void;
};

export type OpenMicrophone = { close: () => void };

/**
 * Wraps a platform microphone in the fan-out contract: one stream however many
 * subscribers, opened by the first and closed after the last leaves.
 */
export const createSharedPcmSource = ({
  open,
  queryPermission,
}: {
  open: (emitter: PcmEmitter) => Promise<OpenMicrophone>;
  queryPermission: () => Promise<PcmPermission>;
}): PcmSource => {
  const subscribers = new Set<PcmSubscriber>();
  let microphone: OpenMicrophone | null = null;
  let opening: Promise<void> | null = null;

  const each = (call: (subscriber: PcmSubscriber) => void) => {
    [...subscribers].forEach(call);
  };

  const emitter: PcmEmitter = {
    frame: (frame) => each((subscriber) => subscriber.onFrame(frame)),
    interrupted: () => each((subscriber) => subscriber.onInterrupted?.()),
    recovered: () => each((subscriber) => subscriber.onRecovered?.()),
    ended: () => {
      const ending = [...subscribers];

      microphone = null;
      subscribers.clear();
      ending.forEach((subscriber) => subscriber.onEnded?.());
    },
  };

  const closeIfUnused = () => {
    if (subscribers.size > 0 || !microphone) {
      return;
    }

    microphone.close();
    microphone = null;
  };

  const ensureOpen = (): Promise<void> => {
    if (microphone) {
      return Promise.resolve();
    }

    opening ??= open(emitter)
      .then((opened) => {
        microphone = opened;
        closeIfUnused();
      })
      .finally(() => {
        opening = null;
      });

    return opening;
  };

  return {
    queryPermission,
    subscribe: async (subscriber) => {
      subscribers.add(subscriber);

      try {
        await ensureOpen();
      } catch (error) {
        subscribers.delete(subscriber);
        throw error;
      }

      return () => {
        subscribers.delete(subscriber);
        closeIfUnused();
      };
    },
  };
};
