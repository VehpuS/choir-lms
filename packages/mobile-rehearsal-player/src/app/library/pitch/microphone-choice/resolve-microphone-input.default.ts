import { microphoneChoiceStore } from './microphone-choice-store';
import { listMediaDevices, probeMicrophone } from './microphone-inputs';
import { microphonePromptRequests } from './microphone-prompt-requests';
import { createMicrophoneInputResolver } from './resolve-microphone-input';

/** The app's resolver: the live choice store, the browser and the prompt. */
export const resolveMicrophoneInput = createMicrophoneInputResolver({
  ask: microphonePromptRequests.request,
  // `hydrate` resolves to what was stored at first read; the live value is
  // the snapshot once that read is done.
  getChoice: async () => {
    await microphoneChoiceStore.hydrate();

    return microphoneChoiceStore.getSnapshot();
  },
  listDevices: listMediaDevices,
  probe: probeMicrophone,
  remember: microphoneChoiceStore.set,
});
