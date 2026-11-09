/**
 * Asks for the offline files view's `Clear all` confirmation from outside it
 * (composite-tracks 9.2): the no-room messages offer `Clear offline files…`,
 * and after the files are cleared the asker retries what ran out of room.
 */
export type ClearOfflineFilesRequest = {
  /** Called once the files have been cleared, never when the user cancels. */
  onCleared?: () => void;
};

type Listener = (request: ClearOfflineFilesRequest) => void;

const listeners = new Set<Listener>();

export const requestClearOfflineFiles = (
  request: ClearOfflineFilesRequest = {},
) => {
  listeners.forEach((listener) => {
    listener(request);
  });
};

export const subscribeToClearOfflineFilesRequests = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
