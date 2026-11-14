import { uniqBy } from 'es-toolkit';

/** One microphone input as the browser reports it. */
export type MicrophoneInput = { deviceId: string; label: string };

/**
 * What the person chose. No stored choice (`null` where it is held) means
 * ask when there is something to choose between.
 */
export type MicrophoneChoice =
  | { kind: 'automatic' }
  | { kind: 'input'; input: MicrophoneInput };

export type RawMediaDevice = {
  deviceId: string;
  kind: string;
  label: string;
};

/** What to do when the microphone is about to open. */
export type InputDecision =
  | { action: 'ask' }
  /** `deviceId` is undefined for the system's own choice. */
  | { action: 'use'; deviceId: string | undefined };

export type InputOption = {
  connected: boolean;
  deviceId: string;
  label: string;
};

const AUDIO_INPUT_KIND = 'audioinput';
// Chrome lists these two aliases next to the real devices; they duplicate an
// input, and "Automatic" already stands for the system's default.
const ALIAS_DEVICE_IDS = new Set(['default', 'communications']);
const AUTOMATIC_VALUE = 'automatic';

export const MICROPHONE_COPY = {
  automaticLabel: 'Automatic (the system’s choice)',
  askLabel: 'Ask each time',
  body: 'Which microphone to use for pitch detection and recording. A headset or earbud microphone can make playback sound thin on some phones; the phone’s own microphone may avoid that.',
  notConnectedSuffix: ' (not connected)',
  promptBody: 'More than one microphone is available.',
  promptTitle: 'Which microphone?',
  rememberLabel: 'Remember my choice',
  settingsSummary: 'Which input to listen with',
  settingsTitle: 'Microphone',
} as const;

/** The audio inputs worth offering: no aliases, no repeats, always named. */
export const toMicrophoneInputs = (
  devices: readonly RawMediaDevice[],
): MicrophoneInput[] => {
  const real = devices.filter(
    (device) =>
      device.kind === AUDIO_INPUT_KIND &&
      device.deviceId !== '' &&
      !ALIAS_DEVICE_IDS.has(device.deviceId),
  );

  return uniqBy(real, (device) => device.deviceId).map((device, index) => ({
    deviceId: device.deviceId,
    // Names stay hidden until a microphone has been allowed.
    label: device.label || `Microphone ${index + 1}`,
  }));
};

/** Whether the browser has shown the real names (a microphone was allowed). */
export const hasInputNames = (devices: readonly RawMediaDevice[]): boolean => {
  return devices.some(
    (device) => device.kind === AUDIO_INPUT_KIND && device.label !== '',
  );
};

export const decideInput = (
  choice: MicrophoneChoice | null,
  inputs: readonly MicrophoneInput[],
): InputDecision => {
  if (choice?.kind === 'automatic') {
    return { action: 'use', deviceId: undefined };
  }

  if (choice?.kind === 'input') {
    const { deviceId } = choice.input;
    const isConnected = inputs.some((input) => input.deviceId === deviceId);

    // An input that is gone falls back to the system's choice, quietly; the
    // stored choice stays for when it comes back.
    return { action: 'use', deviceId: isConnected ? deviceId : undefined };
  }

  return inputs.length > 1
    ? { action: 'ask' }
    : { action: 'use', deviceId: undefined };
};

/**
 * The inputs for the Settings list: those connected now, plus the remembered
 * one when it is not connected, so it is never invisible.
 */
export const listInputOptions = (
  choice: MicrophoneChoice | null,
  inputs: readonly MicrophoneInput[],
): InputOption[] => {
  const options = inputs.map((input) => ({ ...input, connected: true }));

  if (
    choice?.kind === 'input' &&
    !inputs.some((input) => input.deviceId === choice.input.deviceId)
  ) {
    options.push({ ...choice.input, connected: false });
  }

  return options;
};

export const describeInputOption = (option: InputOption): string => {
  return option.connected
    ? option.label
    : `${option.label}${MICROPHONE_COPY.notConnectedSuffix}`;
};

export const serializeMicrophoneChoice = (
  choice: MicrophoneChoice | null,
): string | null => {
  if (choice === null) {
    return null;
  }

  return choice.kind === 'automatic'
    ? AUTOMATIC_VALUE
    : JSON.stringify(choice.input);
};

export const parseMicrophoneChoice = (
  stored: string | null,
): MicrophoneChoice | null => {
  if (stored === AUTOMATIC_VALUE) {
    return { kind: 'automatic' };
  }

  try {
    const parsed: unknown = JSON.parse(stored ?? 'null');
    const input = parsed as Partial<MicrophoneInput> | null;

    return typeof input?.deviceId === 'string' &&
      input.deviceId !== '' &&
      typeof input.label === 'string'
      ? {
          kind: 'input',
          input: { deviceId: input.deviceId, label: input.label },
        }
      : null;
  } catch {
    return null;
  }
};

export type ChoiceRow = { label: string; value: string };

export const ASK_VALUE = 'ask';
export const AUTOMATIC_ROW_VALUE = 'automatic';
const INPUT_VALUE_PREFIX = 'input:';

const inputRowValue = (deviceId: string) => `${INPUT_VALUE_PREFIX}${deviceId}`;

/** The rows of the prompt: Automatic first, then each connected input. */
export const promptRows = (inputs: readonly MicrophoneInput[]): ChoiceRow[] => [
  { label: MICROPHONE_COPY.automaticLabel, value: AUTOMATIC_ROW_VALUE },
  ...inputs.map((input) => ({
    label: input.label,
    value: inputRowValue(input.deviceId),
  })),
];

/** The rows of Settings: the prompt's, with Ask each time first. */
export const settingsRows = (
  choice: MicrophoneChoice | null,
  inputs: readonly MicrophoneInput[],
): ChoiceRow[] => [
  { label: MICROPHONE_COPY.askLabel, value: ASK_VALUE },
  { label: MICROPHONE_COPY.automaticLabel, value: AUTOMATIC_ROW_VALUE },
  ...listInputOptions(choice, inputs).map((option) => ({
    label: describeInputOption(option),
    value: inputRowValue(option.deviceId),
  })),
];

export const selectedRowValue = (choice: MicrophoneChoice | null): string => {
  if (choice === null) {
    return ASK_VALUE;
  }

  return choice.kind === 'automatic'
    ? AUTOMATIC_ROW_VALUE
    : inputRowValue(choice.input.deviceId);
};

/**
 * The input a row stands for, or `undefined` for the system's choice (and for
 * a row that is not in the list).
 */
export const inputForRow = (
  value: string,
  inputs: readonly MicrophoneInput[],
): MicrophoneInput | undefined => {
  return inputs.find((input) => inputRowValue(input.deviceId) === value);
};

/** The choice to store for a Settings row; Ask each time clears it. */
export const choiceFromRow = (
  value: string,
  options: readonly MicrophoneInput[],
): MicrophoneChoice | null => {
  if (value === AUTOMATIC_ROW_VALUE) {
    return { kind: 'automatic' };
  }

  const input = inputForRow(value, options);

  return input ? { kind: 'input', input } : null;
};
