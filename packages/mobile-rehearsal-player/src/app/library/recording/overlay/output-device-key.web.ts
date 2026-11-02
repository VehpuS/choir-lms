import { SHARED_DEVICE_KEY } from './recording-sync-model';

type DeviceInfo = { kind: string; deviceId: string; label: string };

const DEFAULT_DEVICE_ID = 'default';
const AUDIO_OUTPUT_KIND = 'audiooutput';

/**
 * The key for the output in use: the label of the browser's default audio
 * output. Browsers without output labels (or without the permission that
 * reveals them) share one key, and the sheet says so.
 */
export const pickOutputDeviceKey = (devices: readonly DeviceInfo[]): string => {
  const outputs = devices.filter(
    (device) => device.kind === AUDIO_OUTPUT_KIND && device.label,
  );
  const chosen =
    outputs.find((device) => device.deviceId === DEFAULT_DEVICE_ID) ??
    outputs[0];

  return chosen?.label ?? SHARED_DEVICE_KEY;
};

export const getOutputDeviceKey = async (): Promise<string> => {
  const media = (
    globalThis as {
      navigator?: {
        mediaDevices?: { enumerateDevices?: () => Promise<DeviceInfo[]> };
      };
    }
  ).navigator?.mediaDevices;

  try {
    return pickOutputDeviceKey((await media?.enumerateDevices?.()) ?? []);
  } catch {
    return SHARED_DEVICE_KEY;
  }
};
