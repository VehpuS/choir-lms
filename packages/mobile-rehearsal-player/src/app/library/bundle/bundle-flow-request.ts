/**
 * Menus ask for a bundle flow over this small channel and the router-level
 * host, which holds the Drive session, opens it (like the folder offline and
 * saved-item requests). No token passes through here.
 */
export type BundleFlowRequest =
  | { kind: 'backup' }
  | { kind: 'restore' }
  | { kind: 'import' }
  | { kind: 'share'; folderId: string; folderName: string }
  | { kind: 'access-guide' };

type Listener = (request: BundleFlowRequest) => void;

const listeners = new Set<Listener>();

export const requestBundleFlow = (request: BundleFlowRequest) => {
  listeners.forEach((listener) => {
    listener(request);
  });
};

export const subscribeToBundleFlowRequests = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
