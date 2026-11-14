import { useSyncExternalStore } from 'react';

import type { MicrophoneInput } from './microphone-choice-model';

/** What the person answered; `input` is undefined for the system's choice. */
export type MicrophonePromptAnswer = {
  input: MicrophoneInput | undefined;
  remember: boolean;
};

export type MicrophonePromptRequest = {
  inputs: readonly MicrophoneInput[];
  /** Settles the request; later calls do nothing. */
  answer: (answer: MicrophonePromptAnswer) => void;
};

type Listener = () => void;

// The microphone source is platform code with no UI of its own. It files a
// request here and a host component (mounted once in the app) shows the
// prompt, so the source never imports UI.
export const createMicrophonePromptRequests = () => {
  let pending: {
    request: MicrophonePromptRequest;
    promise: Promise<MicrophonePromptAnswer>;
  } | null = null;
  const listeners = new Set<Listener>();
  const notify = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    getSnapshot: () => pending?.request ?? null,
    subscribe: (listener: Listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    /** Asks; a second ask while one is open shares the open one. */
    request: (
      inputs: readonly MicrophoneInput[],
    ): Promise<MicrophonePromptAnswer> => {
      if (pending) {
        return pending.promise;
      }

      let settle: (answer: MicrophonePromptAnswer) => void = () => undefined;
      const promise = new Promise<MicrophonePromptAnswer>((resolve) => {
        settle = resolve;
      });
      const request: MicrophonePromptRequest = {
        inputs,
        answer: (answer) => {
          if (pending?.request !== request) {
            return;
          }

          pending = null;
          settle(answer);
          notify();
        },
      };

      pending = { request, promise };
      notify();

      return promise;
    },
  };
};

export const microphonePromptRequests = createMicrophonePromptRequests();

export const usePendingMicrophonePrompt = () => {
  return useSyncExternalStore(
    microphonePromptRequests.subscribe,
    microphonePromptRequests.getSnapshot,
  );
};
