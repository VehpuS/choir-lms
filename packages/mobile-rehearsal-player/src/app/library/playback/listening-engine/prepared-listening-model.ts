import { trackIdOfListeningOwner } from '../../composite/prepared/prepared-owner';
import type { PreparedCompositeUsage } from '../../composite/prepared/prepared-stem-types';
import { formatByteSize } from '../../offline/format-byte-size';

/**
 * What the offline files view says about audio prepared for single tracks
 * (clear-playback-while-listening design Decision 3): a cache made the first
 * time a track is played with the microphone on, listed with its size and
 * cleared with the other offline files. Clearing it removes no track.
 */

export const PREPARED_LISTENING_COPY = {
  groupTitle: 'Prepared for listening',
  cacheNote: 'made again when a track is next played with the microphone on',
  removedTrack: 'Removed track',
} as const;

export type PreparedListeningRow = {
  ownerId: string;
  name: string;
  sizeBytes: number;
  sizeLabel: string;
};

export type PreparedListeningSummary = {
  count: number;
  totalBytes: number;
  /** `54 MB · made again when a track is next played with the microphone on`. */
  groupLine: string;
  rows: PreparedListeningRow[];
};

/** Only the listening owners among `usage`; composites are another group. */
export const buildPreparedListeningSummary = (
  usage: readonly PreparedCompositeUsage[],
  getTrackName: (trackId: string) => string | undefined,
): PreparedListeningSummary => {
  const rows = usage
    .flatMap((entry) => {
      const trackId = trackIdOfListeningOwner(entry.compositeId);

      return trackId === null
        ? []
        : [
            {
              ownerId: entry.compositeId,
              name:
                getTrackName(trackId) ?? PREPARED_LISTENING_COPY.removedTrack,
              sizeBytes: entry.sizeBytes,
              sizeLabel: formatByteSize(entry.sizeBytes),
            },
          ];
    })
    .sort((a, b) => b.sizeBytes - a.sizeBytes);
  const totalBytes = rows.reduce((sum, row) => sum + row.sizeBytes, 0);

  return {
    count: rows.length,
    totalBytes,
    groupLine: `${formatByteSize(totalBytes)} · ${PREPARED_LISTENING_COPY.cacheNote}`,
    rows,
  };
};
