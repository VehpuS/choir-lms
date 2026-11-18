import type { ListeningLoadState } from './listening-load-state';

const PERCENT = 100;

/**
 * The mini-player and sheet line while a track is put on the engine. Preparing
 * happens once per track and can take a few seconds, so it says so; opening a
 * prepared track is quick and needs no line of its own.
 */
export const getListeningLoadLabel = (
  state: ListeningLoadState | null,
): string | null => {
  if (state?.phase !== 'preparing') {
    return null;
  }

  const percent = Math.min(PERCENT, Math.floor(state.fraction * PERCENT));

  return `Preparing for listening · ${percent}% · first time only`;
};
