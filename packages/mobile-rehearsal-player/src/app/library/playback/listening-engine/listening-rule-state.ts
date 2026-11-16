import { useSyncExternalStore } from 'react';

import { webAudioSession } from '../../../components/audio-session/web-audio-session';
import {
  isRecordingStripOpen,
  subscribeRecordingStrip,
} from '../../recording/recording-strip-store';

/**
 * The two things the rule reads besides the item (clear-playback-while-
 * listening design Decisions 1 and 4): whether a microphone is open and whether
 * the Recording tool is. Kept in one place so a load and the hand-over read
 * the same state, and the hand-over is told when either changes.
 */
export const getListeningRuleState = () => ({
  isMicrophoneOpen: webAudioSession.isCapturing(),
  isRecordingToolOpen: isRecordingStripOpen(),
});

const subscribe = (listener: () => void) => {
  const stopCapture = webAudioSession.subscribeCapture(listener);
  const stopStrip = subscribeRecordingStrip(listener);

  return () => {
    stopCapture();
    stopStrip();
  };
};

// A string, so the snapshot is stable between changes.
const getKey = () => {
  const state = getListeningRuleState();

  return `${state.isMicrophoneOpen}:${state.isRecordingToolOpen}`;
};

/** Changes whenever the rule's state does. */
export const useListeningRuleKey = (): string =>
  useSyncExternalStore(subscribe, getKey, getKey);
