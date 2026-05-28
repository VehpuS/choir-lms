export type SavedTrackPlaybackRemoteCommand =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous';

export type SavedTrackPlaybackRemoteCommandHandlers = Record<
  SavedTrackPlaybackRemoteCommand,
  () => Promise<void>
>;

let savedTrackPlaybackRemoteCommandHandlers:
  | SavedTrackPlaybackRemoteCommandHandlers
  | null = null;

export const registerSavedTrackPlaybackRemoteCommandHandlers = (
  handlers: SavedTrackPlaybackRemoteCommandHandlers,
) => {
  savedTrackPlaybackRemoteCommandHandlers = handlers;

  return () => {
    if (savedTrackPlaybackRemoteCommandHandlers === handlers) {
      savedTrackPlaybackRemoteCommandHandlers = null;
    }
  };
};

export const dispatchSavedTrackPlaybackRemoteCommand = async (
  command: SavedTrackPlaybackRemoteCommand,
) => {
  const handler = savedTrackPlaybackRemoteCommandHandlers?.[command];

  if (!handler) {
    return false;
  }

  await handler();

  return true;
};