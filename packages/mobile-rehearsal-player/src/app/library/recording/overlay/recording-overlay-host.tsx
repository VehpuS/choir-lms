import { useEffect, useState } from 'react';

import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { getSavedTrackPlayer } from '../../playback/utils/saved-track-player-interop';
import { setTrackGain } from '../../playback/track-gain';
import { getRecordingsStore } from '../recordings-store-instance';
import {
  clearRecordingMix,
  startRecordingMix,
  useRecordingMixState,
} from './recording-mix-store';
import { getRecordingMix } from './recording-mix-model';
import { setRecordingOverlayStatus } from './recording-overlay-status';
import { takePendingPreviewBalance } from './recording-preview-request';
import {
  startRecordingOverlay,
  type RecordingOverlayHandle,
} from './recording-overlay';

type RecordingOverlayHostProps = {
  playback: Pick<
    ReturnType<typeof useSavedTrackPlayback>,
    'activePlayableItem' | 'playbackState' | 'volumeLevel'
  >;
};

/** Hands the track its share of the balance; the volume slider's own level stays on top of it. */
const applyTrackVolume = (trackVolume: number) => {
  void Promise.resolve(getSavedTrackPlayer().setVolume(trackVolume)).catch(
    () => undefined,
  );
};

/**
 * Plays the active recording item's own sound over its track and applies its
 * balance. It follows the active item: a recording starts one overlay, and
 * playing anything else (or another recording) ends it and gives the track
 * its full volume back. The overlay waits for the track to have loaded so it
 * attaches to the element that is playing the track.
 */
export const RecordingOverlayHost = ({
  playback,
}: RecordingOverlayHostProps) => {
  const recordingId = playback.activePlayableItem?.recordingId;
  const isLoaded =
    playback.playbackState !== undefined &&
    playback.playbackState !== 'loading' &&
    playback.playbackState !== 'none';
  const [overlay, setOverlay] = useState<RecordingOverlayHandle | null>(null);
  const { balance, recordingId: mixedRecordingId } = useRecordingMixState();

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

        // A preview may have asked to start at a balance that is not saved yet.
        startRecordingMix(
          recording.id,
          recording.balance,
          takePendingPreviewBalance(recording.id),
        );

        return startRecordingOverlay(recording);
      })
      .then((handle) => {
        if (isDisposed) {
          handle?.dispose();

          return;
        }

        dispose = handle?.dispose ?? null;
        setOverlay(handle);
      })
      .catch(() => undefined);

    return () => {
      isDisposed = true;
      dispose?.();
      setOverlay(null);
      clearRecordingMix();
      setRecordingOverlayStatus({ kind: 'idle' });
      // The next item plays at the volume the slider says, with no balance.
      setTrackGain(1);
      applyTrackVolume(playback.volumeLevel);
    };
    // The cleanup reads the volume when it runs; the overlay itself must not
    // restart when the volume moves.
  }, [isLoaded, recordingId]);

  useEffect(() => {
    if (mixedRecordingId === null || mixedRecordingId !== recordingId) {
      return;
    }

    const mix = getRecordingMix({
      balance,
      volumeLevel: playback.volumeLevel,
    });

    overlay?.setLevel(mix.recordingLevel);
    setTrackGain(mix.volumeShare);
    applyTrackVolume(mix.trackVolume);
  }, [balance, mixedRecordingId, overlay, playback.volumeLevel, recordingId]);

  return null;
};
