import { type NamedLoop, type Playlist } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';

type UseSavedPlaylistDetailActionsOptions = {
  onEditPlaylistTags: (playlistId: string) => void;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  selectedPlaylist: Playlist | null;
  toggleActivePlayback: () => Promise<void>;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
    startEntryId?: string;
  }) => Promise<void>;
};

export const useSavedPlaylistDetailActions = ({
  onEditPlaylistTags,
  savedLoops,
  savedSources,
  selectedPlaylist,
  toggleActivePlayback,
  togglePlaylistPlayback,
}: UseSavedPlaylistDetailActionsOptions) => {
  const editPlaylistTags = () => {
    if (!selectedPlaylist) {
      return;
    }

    onEditPlaylistTags(selectedPlaylist.id);
  };

  const playOrderedPlaylist = () => {
    if (!selectedPlaylist) {
      return;
    }

    void togglePlaylistPlayback({
      loops: savedLoops,
      mode: 'ordered',
      playlist: selectedPlaylist,
      sources: savedSources,
    });
  };

  const playShuffledPlaylist = () => {
    if (!selectedPlaylist) {
      return;
    }

    void togglePlaylistPlayback({
      loops: savedLoops,
      mode: 'shuffle',
      playlist: selectedPlaylist,
      sources: savedSources,
    });
  };

  const playPlaylistEntry = (entryId: string) => {
    if (!selectedPlaylist) {
      return;
    }

    void togglePlaylistPlayback({
      loops: savedLoops,
      mode: 'ordered',
      playlist: selectedPlaylist,
      sources: savedSources,
      startEntryId: entryId,
    });
  };

  return {
    editPlaylistTags,
    playOrderedPlaylist,
    playPlaylistEntry,
    playShuffledPlaylist,
    toggleCurrentPlayback() {
      void toggleActivePlayback();
    },
  };
};
