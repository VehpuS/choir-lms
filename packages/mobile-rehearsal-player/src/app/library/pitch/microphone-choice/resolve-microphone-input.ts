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
  const needsNames = (
    choice: MicrophoneChoice | null,
    devices: readonly RawMediaDevice[],
  ) => {
    if (choice?.kind === 'automatic' || hasInputNames(devices)) {
      return false;
    }

    // With nothing remembered and at most one input, there is nothing to ask.
    return choice !== null || toMicrophoneInputs(devices).length > 1;
  };

  return async (): Promise<string | undefined> => {
    const choice = await deps.getChoice();
    let devices = await deps.listDevices();

    if (needsNames(choice, devices)) {
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
