import { useSyncExternalStore } from 'react';

import type { ListeningRuleState } from './load-listening-item';

import { webAudioSession } from '../../../components/audio-session/web-audio-session';
import { appVisibility } from '../../pitch/app-visibility';
import {
  isRecordingStripOpen,
  subscribeRecordingStrip,
} from '../../recording/recording-strip-store';

/**
 * What the rule reads besides the item (clear-playback-while-listening design
 * Decisions 1 and 4): whether a microphone is open, whether the Recording tool
 * is, and whether the app is hidden. Kept in one place so a load and the hand-over read
 * the same state, and the hand-over is told when either changes.
 */
export const getListeningRuleState = (): ListeningRuleState => ({
  isMicrophoneOpen: webAudioSession.isCapturing(),
  isRecordingToolOpen: isRecordingStripOpen(),
  isAppHidden: !appVisibility.isVisible(),
});

const subscribe = (listener: () => void) => {
  const stopCapture = webAudioSession.subscribeCapture(listener);
  const stopStrip = subscribeRecordingStrip(listener);
  // Hiding the app is acted on directly, not through the microphone closing:
  // the hand-back to the media element has to start before the page is slowed.
  const stopVisibility = appVisibility.subscribe(listener);

  return () => {
    stopCapture();
    stopStrip();
    stopVisibility();
  };
};

// A string, so the snapshot is stable between changes.
const getKey = () => {
  const state = getListeningRuleState();

  return `${state.isMicrophoneOpen}:${state.isRecordingToolOpen}:${state.isAppHidden}`;
};

/** Changes whenever the rule's state does. */
export const useListeningRuleKey = (): string =>
  useSyncExternalStore(subscribe, getKey, getKey);
