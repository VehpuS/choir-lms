import { SHARED_DEVICE_KEY } from './recording-sync-model';

/** Native cannot record yet; one shared key keeps the API the web file has. */
export const getOutputDeviceKey = async (): Promise<string> =>
  SHARED_DEVICE_KEY;
