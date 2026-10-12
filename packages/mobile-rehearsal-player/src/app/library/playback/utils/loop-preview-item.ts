import type { PlayableItem } from '@org/audio-library-models';

/** The id prefix of the loop editor's preview items. */
export const LOOP_PREVIEW_ITEM_ID_PREFIX = 'loop-preview:';

/**
 * A preview of a loop range in the editor. It plays at the session's speed and
 * pitch and leaves them alone, so nudging a loop while practicing at 0.80× does
 * not reset the setting (task 8.52).
 */
export const isLoopPreviewItem = (playableItem: Pick<PlayableItem, 'id'>) => {
  return playableItem.id.startsWith(LOOP_PREVIEW_ITEM_ID_PREFIX);
};
