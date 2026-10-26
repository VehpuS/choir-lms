// A Files folder row's `Keep offline` / `Remove from offline` asks for the
// action over this small channel; the Files selection, which can expand the
// folder into its files, runs it (like the saved-item requests).
export type FolderOfflineRequest = {
  action: 'keep-offline' | 'remove-offline';
  folderId: string;
};

type Listener = (request: FolderOfflineRequest) => void;

const listeners = new Set<Listener>();

export const requestFolderOffline = (request: FolderOfflineRequest) => {
  listeners.forEach((listener) => {
    listener(request);
  });
};

export const subscribeToFolderOfflineRequests = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
