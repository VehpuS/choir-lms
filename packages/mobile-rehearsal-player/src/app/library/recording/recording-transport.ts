import type { Transport } from '@org/audio-mixing';

/**
 * The playing track's transport for the timeline, where the platform has one
 * the recorder can read. Native cannot record (see `recordingCapabilities`), so
 * there is none; the web file reads the player's media element.
 */
export const getRecordingTransport = (): Transport | null => null;
