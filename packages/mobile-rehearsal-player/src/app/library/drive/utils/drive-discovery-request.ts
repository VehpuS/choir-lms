export const createDriveDiscoveryRequest = () => {
  const abortController = new AbortController();
  let isDisposed = false;

  return {
    dispose() {
      isDisposed = true;
      abortController.abort();
    },
    shouldApplyResult() {
      return !isDisposed;
    },
    signal: abortController.signal,
  };
};
