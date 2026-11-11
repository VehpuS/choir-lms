// The Playlists view's `+` control owns its create dialog. In the wide-short
// layout the button moves into the screen header, which asks for that dialog
// through this tiny request channel, as the Files create menu does
// (`files-create-menu-request.ts`).
type Listener = () => void;

const listeners = new Set<Listener>();

export const requestPlaylistCreateDialog = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const subscribeToPlaylistCreateRequests = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
