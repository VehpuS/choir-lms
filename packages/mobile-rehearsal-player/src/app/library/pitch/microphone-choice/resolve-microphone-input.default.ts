import { microphoneChoiceStore } from './microphone-choice-store';
import { listMediaDevices, probeMicrophone } from './microphone-inputs';
import { microphonePromptRequests } from './microphone-prompt-requests';
import { createMicrophoneInputResolver } from './resolve-microphone-input';

/** The app's resolver: the live choice store, the browser and the prompt. */
export const resolveMicrophoneInput = createMicrophoneInputResolver({
  ask: microphonePromptRequests.request,
  getChoice: microphoneChoiceStore.hydrate,
  listDevices: listMediaDevices,
  probe: probeMicrophone,
  remember: microphoneChoiceStore.set,
});
