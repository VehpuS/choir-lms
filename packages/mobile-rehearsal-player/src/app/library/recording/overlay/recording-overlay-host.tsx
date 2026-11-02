import { useEffect } from 'react';

import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { getRecordingsStore } from '../recordings-store-instance';
import { setRecordingOverlayStatus } from './recording-overlay-status';
import { startRecordingOverlay } from './recording-overlay';

type RecordingOverlayHostProps = {
  playback: Pick<
    ReturnType<typeof useSavedTrackPlayback>,
    'activePlayableItem' | 'playbackState'
  >;
};

/**
 * Plays the active recording item's own sound over its track. It follows the
 * active item: a recording starts one overlay, and playing anything else
 * (or another recording) ends it. The overlay waits for the track to have
 * loaded so it attaches to the element that is playing the track.
 */
export const RecordingOverlayHost = ({
  playback,
}: RecordingOverlayHostProps) => {
  const recordingId = playback.activePlayableItem?.recordingId;
  const isLoaded =
    playback.playbackState !== undefined &&
    playback.playbackState !== 'loading' &&
    playback.playbackState !== 'none';

  useEffect(() => {
    if (!recordingId || !isLoaded) {
      return;
    }

    let isDisposed = false;
    let dispose: (() => void) | null = null;

    void getRecordingsStore()
      .get(recordingId)
      .then((recording) => {
        if (!recording || isDisposed) {
          return null;
        }

        return startRecordingOverlay(recording);
      })
      .then((handle) => {
        if (isDisposed) {
          handle?.dispose();

          return;
        }

        dispose = handle?.dispose ?? null;
      })
      .catch(() => undefined);

    return () => {
      isDisposed = true;
      dispose?.();
      setRecordingOverlayStatus({ kind: 'idle' });
    };
  }, [isLoaded, recordingId]);

  return null;
};
