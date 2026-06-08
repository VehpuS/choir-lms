export type SavedRehearsalLibraryDetailMode =
  | 'browse'
  | 'playlist-detail'
  | 'track-loop-detail';

export const resolveSavedRehearsalLibraryDetailMode = (options: {
  isPlaylistDetailVisible: boolean;
  selectedLoopViewSourceId: string | null;
}): SavedRehearsalLibraryDetailMode => {
  if (options.isPlaylistDetailVisible) {
    return 'playlist-detail';
  }

  if (options.selectedLoopViewSourceId !== null) {
    return 'track-loop-detail';
  }

  return 'browse';
};