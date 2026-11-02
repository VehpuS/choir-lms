import type { ClickOutput } from './click-calibration-run';

/** Native cannot record or play clicks yet (see `recordingCapabilities`); the web file does. */
export const createClickOutput = (): ClickOutput | null => null;
