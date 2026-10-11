import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
  Playlist,
} from '@org/audio-library-models';
import { createContext, useContext } from 'react';

import type { BulkAcknowledgment } from './bulk-playback-run';

// What every Library selection surface needs from the screen but should not
// have threaded through each intermediate component: the saved collections,
// the playback queue, playlist writes, and the completion acknowledgment.
export type LibrarySelectionServices = {
  acknowledge: (acknowledgment: BulkAcknowledgment) => void;
  /** Something is playing; `Play next` and `Add to queue` need a queue to join. */
  canQueue: boolean;
  collections: {
    loops: NamedLoop[];
    playlists: Playlist[];
    sources: DriveAudioSource[];
  };
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  /** False while another tab is showing, so an open selection ends. */
  isDestinationActive: boolean;
  queueItemsNext: (items: readonly PlayableItem[]) => void;
  queueItemsUpNext: (items: readonly PlayableItem[]) => void;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

const LibrarySelectionServicesContext =
  createContext<LibrarySelectionServices | null>(null);

export const LibrarySelectionServicesProvider =
  LibrarySelectionServicesContext.Provider;

export const useLibrarySelectionServices = (): LibrarySelectionServices => {
  const services = useContext(LibrarySelectionServicesContext);

  if (!services) {
    throw new Error(
      'Library selection surfaces must render inside LibrarySelectionServicesProvider.',
    );
  }

  return services;
};
