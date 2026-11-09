import { DriveLibraryStatusCard } from '../drive/components/drive-library-status-card';

type LibraryEmptyStateProps = {
  /** What is missing: `No recordings yet`. */
  title: string;
  /** How to add one: `Open a track, …`. */
  message: string;
};

/**
 * The empty state every Library view shares (composite-tracks 12.17): a title
 * saying what is missing, then one line on how to add one. Tracks, Loops and
 * Playlists reach the same card through their status copy.
 */
export const LibraryEmptyState = ({
  message,
  title,
}: LibraryEmptyStateProps) => (
  <DriveLibraryStatusCard
    isLoading={false}
    statusCopy={{ message, title, tone: 'neutral' }}
  />
);
