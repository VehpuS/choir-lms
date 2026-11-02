import type { NamedLoop } from '@org/audio-library-models';
import { useEffect, useRef } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { resolveRecordingPlayback } from '../recording-playback-item';
import { getRecordingsStore } from '../recordings-store-instance';
import { setRecordingMixBalanceFor } from './recording-mix-store';
import {
  setPendingPreviewBalance,
  subscribeToRecordingPreview,
  type RecordingPreviewRequest,
} from './recording-preview-request';

type RecordingPreviewHostProps = {
  library: {
    savedLibrarySources: readonly DriveLibrarySource[];
    savedLoops: readonly NamedLoop[];
  };
  playback: Pick<
    ReturnType<typeof useSavedTrackPlayback>,
    'activePlayableItem' | 'playbackState' | 'togglePlayableItemPlayback'
  >;
};

/**
 * Plays a recording over its track on behalf of a place that is setting its
 * balance, at the balance on screen, and stops it again when that place
 * closes. A recording that is already the active item just follows the new
 * balance; one that is not is started with that balance instead of its saved
 * one (the saved balance is untouched until the user keeps it).
 */
export const RecordingPreviewHost = ({
  library,
  playback,
}: RecordingPreviewHostProps) => {
  // Requests arrive between renders, so they read the latest state from here.
  const latest = useRef({ library, playback });

  latest.current = { library, playback };

  useEffect(() => {
    const handle = async (request: RecordingPreviewRequest) => {
      const { library: current, playback: player } = latest.current;
      const active = player.activePlayableItem;
      const isActive = active?.recordingId === request.recordingId;
      const isPlaying = player.playbackState === 'playing';

      if (request.kind === 'stop') {
        if (active && isActive && isPlaying) {
          await player.togglePlayableItemPlayback(active);
        }

        return;
      }

      if (active && isActive) {
        setRecordingMixBalanceFor(request.recordingId, request.balance);

        if (!isPlaying) {
          await player.togglePlayableItemPlayback(active);
        }

        return;
      }

      const recording = await getRecordingsStore().get(request.recordingId);
      const resolution = recording
        ? resolveRecordingPlayback(recording, {
            sources: current.savedLibrarySources,
            loops: current.savedLoops,
          })
        : null;

      if (resolution?.kind !== 'item') {
        return;
      }

      setPendingPreviewBalance(request.recordingId, request.balance);
      await player.togglePlayableItemPlayback(resolution.item);
    };

    return subscribeToRecordingPreview((request) => {
      void handle(request).catch(() => undefined);
    });
  }, []);

  return null;
};
