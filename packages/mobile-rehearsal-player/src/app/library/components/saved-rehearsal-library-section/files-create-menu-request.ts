// The Files create menu (`Create folder`, `Add tracks from Drive`, `Create
// playlist`) lives with the `+` control outside the Files view. A folder's
// empty state offers the same actions, so it asks for that menu through this
// tiny request channel instead of owning a copy of it (task 8.94).
type Listener = () => void;

const listeners = new Set<Listener>();

export const requestFilesCreateMenu = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const subscribeToFilesCreateMenuRequests = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
