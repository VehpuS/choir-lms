import type { RawMediaDevice } from './microphone-choice-model';
import type { BrowserMicrophoneGlobals } from '../web-microphone-types';

const browser = () => globalThis as unknown as BrowserMicrophoneGlobals;

/** Every media device the browser lists (names are empty until allowed). */
export const listMediaDevices = async (): Promise<RawMediaDevice[]> => {
  try {
    return (
      (await browser().navigator?.mediaDevices?.enumerateDevices?.()) ?? []
    );
  } catch {
    return [];
  }
};

/**
 * Opens the system's input and closes it again, which is how a browser comes
 * to show input names. Rejects like `getUserMedia` (for example when denied).
 */
export const probeMicrophone = async (): Promise<void> => {
  const getUserMedia = browser().navigator?.mediaDevices?.getUserMedia;

  if (!getUserMedia) {
    return;
  }

  const stream = await getUserMedia.call(browser().navigator?.mediaDevices, {
    audio: true,
  });

  stream.getTracks().forEach((track) => track.stop());
};

/** Calls back when an input is plugged in or removed; returns the unsubscribe. */
export const onMicrophoneDevicesChanged = (listener: () => void) => {
  const devices = browser().navigator?.mediaDevices;

  devices?.addEventListener?.('devicechange', listener);

  return () => {
    devices?.removeEventListener?.('devicechange', listener);
  };
};
