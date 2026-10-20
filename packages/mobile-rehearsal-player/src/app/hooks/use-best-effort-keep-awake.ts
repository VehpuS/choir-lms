import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

import { type KeepAwakeControls, keepScreenAwake } from './keep-screen-awake';

const platformControls: KeepAwakeControls = {
  activate: activateKeepAwakeAsync,
  deactivate: deactivateKeepAwake,
};

/** Keeps the screen on while the calling component is mounted. */
export const useBestEffortKeepAwake = (tag: string): void => {
  useEffect(() => keepScreenAwake(tag, platformControls), [tag]);
};
