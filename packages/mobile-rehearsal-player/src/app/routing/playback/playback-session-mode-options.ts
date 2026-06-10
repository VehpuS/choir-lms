import { type RepeatMode } from '@org/audio-library-models';

export const DEFAULT_REPEAT_MODES: RepeatMode[] = ['off', 'one', 'all'];
export const STANDALONE_REPEAT_MODES: RepeatMode[] = ['off', 'one'];

export const resolveVisibleRepeatModes = (activeQueueMode: boolean) => {
  return activeQueueMode ? DEFAULT_REPEAT_MODES : STANDALONE_REPEAT_MODES;
};
