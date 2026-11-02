/**
 * Lets a menu or sheet ask for recordings to be exported without owning the
 * dialog. The host that holds the Drive session opens the dialog, so every
 * entry point (the save sheet, the row menus, the bulk bar) goes through here.
 */
export type RecordingExportRequest = { recordingIds: readonly string[] };

type Listener = (request: RecordingExportRequest) => void;

const listeners = new Set<Listener>();

export const requestRecordingExport = (request: RecordingExportRequest) => {
  listeners.forEach((listener) => listener(request));
};

export const subscribeToRecordingExport = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
