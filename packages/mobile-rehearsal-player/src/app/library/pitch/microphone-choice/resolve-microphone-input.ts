import {
  decideInput,
  hasInputNames,
  toMicrophoneInputs,
  type MicrophoneChoice,
  type MicrophoneInput,
  type RawMediaDevice,
} from './microphone-choice-model';
import type { MicrophonePromptAnswer } from './microphone-prompt-requests';

export type ResolveMicrophoneInputDeps = {
  /** Asks the person; resolves with their answer. */
  ask: (inputs: readonly MicrophoneInput[]) => Promise<MicrophonePromptAnswer>;
  getChoice: () => Promise<MicrophoneChoice | null>;
  listDevices: () => Promise<RawMediaDevice[]>;
  /** Opens and closes the system's input, so the browser shows input names. */
  probe: () => Promise<void>;
  remember: (choice: MicrophoneChoice) => Promise<void>;
};

const answerToChoice = (input: MicrophoneInput | undefined) => {
  return input
    ? ({ kind: 'input', input } as const)
    : ({ kind: 'automatic' } as const);
};

/**
 * Which input to open: the `deviceId` to ask the browser for, or `undefined`
 * for the system's own choice. Asks only when there is a real choice and none
 * is remembered; closing the prompt means the system's choice, this once.
 */
export const createMicrophoneInputResolver = (
  deps: ResolveMicrophoneInputDeps,
) => {
  return async (): Promise<string | undefined> => {
    const choice = await deps.getChoice();
    let devices = await deps.listDevices();

    if (choice?.kind === 'automatic') {
      return undefined;
    }

    if (!hasInputNames(devices)) {
      // Safari lists one nameless placeholder (no id) until a microphone has
      // been opened in the page, so the count means nothing yet. A remembered
      // input is asked for by its stored id (an unplugged one falls back to
      // the system's choice); otherwise the system's input is opened and
      // closed once to learn the real list.
      if (choice?.kind === 'input') {
        return choice.input.deviceId;
      }

      await deps.probe();
      devices = await deps.listDevices();
    }

    const inputs = toMicrophoneInputs(devices);
    const decision = decideInput(choice, inputs);

    if (decision.action === 'use') {
      return decision.deviceId;
    }

    const answer = await deps.ask(inputs);

    if (answer.remember) {
      await deps.remember(answerToChoice(answer.input));
    }

    return answer.input?.deviceId;
  };
};
