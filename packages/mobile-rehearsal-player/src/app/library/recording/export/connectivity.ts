import type { Connectivity } from './auto-export-queue';

/** Native has no connection reader yet (see `recordingCapabilities`); the web file reads the browser's. */
export const appConnectivity: Connectivity = {
  connectionType: () => 'unknown',
  isOnline: () => true,
  subscribe: () => () => undefined,
};

/** Whether the platform can tell Wi-Fi from mobile data, which `Upload over` depends on. */
export const canTellConnectionType = (): boolean => false;
