import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
  Playlist,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import { createContext, useContext } from 'react';

import type {
  BulkTagChange,
  BulkTagTarget,
} from '../components/tag-editor-sheet/bulk-tags';
import type { BulkOperationResult } from '../saved-rehearsal-library/library-files-bulk-operations';
import type { UseLibraryFilesResult } from '../saved-rehearsal-library/use-library-files';
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
  /**
   * The Files tree and its batched operations, for the views that copy or
   * remove entities. Rebuilt every render, so read it at call time.
   */
  files: UseLibraryFilesResult;
  /** Folders carry tags too, so the bulk tag editor reads them. */
  folders: RehearsalLibraryFolderNode[];
  /** False while another tab is showing, so an open selection ends. */
  isDestinationActive: boolean;
  queueItemsNext: (items: readonly PlayableItem[]) => void;
  queueItemsUpNext: (items: readonly PlayableItem[]) => void;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  /** One write that adds and removes tags across the targets. */
  updateTags: (
    change: BulkTagChange & { targets: readonly BulkTagTarget[] },
  ) => Promise<BulkOperationResult>;
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
