import { PcmSourceError, type PcmSourceFailure } from './pcm-source-types';

const DENIED_ERRORS = new Set(['NotAllowedError', 'SecurityError']);
const IN_USE_ERRORS = new Set(['NotReadableError', 'AbortError']);

/** Maps a `getUserMedia` failure onto the reasons the UI distinguishes. */
export const microphoneFailureReason = (error: unknown): PcmSourceFailure => {
  const name = error instanceof Error ? error.name : '';

  if (DENIED_ERRORS.has(name)) {
    return 'denied';
  }

  return IN_USE_ERRORS.has(name) ? 'in-use' : 'unavailable';
};

export const toPcmSourceError = (error: unknown): PcmSourceError => {
  return error instanceof PcmSourceError
    ? error
    : new PcmSourceError(microphoneFailureReason(error));
};
