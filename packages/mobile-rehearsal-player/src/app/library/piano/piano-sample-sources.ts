/** Native has no piano sound yet (`native-playback-follow-ups`). */
export const loadPianoSample = async (): Promise<ArrayBuffer> => {
  throw new Error('Piano samples are only available on web.');
};

/** Nothing to fetch ahead of time on native. */
export const warmPianoSamples = (): void => undefined;
