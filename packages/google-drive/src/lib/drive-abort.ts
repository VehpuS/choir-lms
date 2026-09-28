const ABORT_ERROR_NAME = 'AbortError';

/**
 * Stops a Drive walk once its signal has aborted, throwing an `AbortError`
 * callers can recognise by name. Checks `aborted` rather than calling
 * `AbortSignal.throwIfAborted`, which React Native's `AbortSignal` does not
 * provide.
 */
export const throwIfDriveRequestAborted = (
  signal: AbortSignal | undefined,
  message = 'Drive request was aborted.',
) => {
  if (!signal?.aborted) {
    return;
  }

  const abortError = new Error(message);
  abortError.name = ABORT_ERROR_NAME;
  throw abortError;
};
