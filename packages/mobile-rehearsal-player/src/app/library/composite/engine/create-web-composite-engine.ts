import type { CompositeEngine } from './composite-engine';

/** Native has no composite engine: composites are web only for now (composite-tracks non-goals). */
export const createWebCompositeEngine = async (): Promise<CompositeEngine> => {
  throw new Error('Composites play on web for now.');
};

export const getCompositeAudioContext = (): null => null;
