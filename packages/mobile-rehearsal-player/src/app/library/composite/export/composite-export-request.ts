/**
 * Lets the Mix panel ask for the composite export dialog without owning it:
 * the host that holds the Drive session opens it (composite-tracks 10.2).
 */
export type CompositeExportRequest = { compositeId: string };

type Listener = (request: CompositeExportRequest) => void;

const listeners = new Set<Listener>();

export const requestCompositeExport = (request: CompositeExportRequest) => {
  listeners.forEach((listener) => listener(request));
};

export const subscribeToCompositeExport = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
