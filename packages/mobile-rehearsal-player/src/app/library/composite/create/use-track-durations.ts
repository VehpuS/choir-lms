import type { DriveAudioSource } from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import { probeTrackDurationMs } from './probe-track-duration';

export type TrackDurations = {
  /** Lengths learned here, by track id; the library's own lengths are not repeated. */
  durationsByTrackId: Readonly<Record<string, number>>;
  /** Tracks whose length could not be read. */
  unreadableTrackIds: readonly string[];
};

type UseTrackDurationsOptions = {
  accessToken: string | null;
  /** Saves a learned length so the library knows it next time. */
  persistDuration: (trackId: string, durationMs: number) => void;
  /** Reads one length; replaceable in specs. */
  probe?: typeof probeTrackDurationMs;
};

const NO_DURATIONS: TrackDurations = {
  durationsByTrackId: {},
  unreadableTrackIds: [],
};

/**
 * Learns the lengths the create sheet is waiting for, one track at a time,
 * and saves each into the library. Only tracks with no known length are read.
 */
export const useTrackDurations = (
  tracks: readonly DriveAudioSource[],
  options: UseTrackDurationsOptions,
): TrackDurations => {
  const [learned, setLearned] = useState<TrackDurations>(NO_DURATIONS);
  const {
    accessToken,
    persistDuration,
    probe = probeTrackDurationMs,
  } = options;
  // A stable key: the effect restarts only when the set of unknown tracks changes.
  const unknownKey = tracks
    .filter((track) => track.durationMs === undefined)
    .map((track) => track.id)
    .join('|');

  useEffect(() => {
    if (unknownKey === '') {
      return;
    }

    let cancelled = false;
    const unknown = tracks.filter((track) => track.durationMs === undefined);

    void (async () => {
      for (const track of unknown) {
        const durationMs = await probe(track, accessToken);

        if (cancelled) {
          return;
        }

        if (durationMs === null) {
          setLearned((current) => ({
            ...current,
            unreadableTrackIds: [...current.unreadableTrackIds, track.id],
          }));
        } else {
          persistDuration(track.id, durationMs);
          setLearned((current) => ({
            ...current,
            durationsByTrackId: {
              ...current.durationsByTrackId,
              [track.id]: durationMs,
            },
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // `tracks`, `probe` and `persistDuration` are read once per unknown set.
  }, [unknownKey, accessToken]);

  return learned;
};
