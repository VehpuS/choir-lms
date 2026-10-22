import type { DeviceFileChoice } from './device-file-chooser-types';

/**
 * Native has no document picker in this change, so saving a file from the
 * device is not offered there; the web file draws the browser's chooser.
 */
export const chooseDeviceFile = async (): Promise<DeviceFileChoice> => {
  return { status: 'unsupported' };
};
