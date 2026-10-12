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

/** What to do when the editor's range changes while its preview is the active item. */
export type PreviewRangeSync = {
  /** Where to move the playhead, when it would otherwise sit outside the new range. */
  seekToSeconds: number | null;
  shouldUpdate: boolean;
};

const MS_PER_SECOND = 1000;

/**
 * The preview item keeps one id per source, so a changed start or end does not
 * reload the file (tasks 8.38, 8.46): the active item takes the new range and
 * keeps playing, and the playhead moves only when it falls outside it.
 */
export const resolvePreviewRangeSync = (options: {
  active: PlayableItem | null;
  playbackPositionSeconds: number;
  preview: PlayableItem;
}): PreviewRangeSync => {
  const { active, preview } = options;

  if (
    !active ||
    active.id !== preview.id ||
    (active.range.startMs === preview.range.startMs &&
      active.range.endMs === preview.range.endMs)
  ) {
    return { seekToSeconds: null, shouldUpdate: false };
  }

  const startSeconds = preview.range.startMs / MS_PER_SECOND;
  const endSeconds =
    preview.range.endMs === null
      ? Number.POSITIVE_INFINITY
      : preview.range.endMs / MS_PER_SECOND;
  const isOutside =
    options.playbackPositionSeconds < startSeconds ||
    options.playbackPositionSeconds >= endSeconds;

  return {
    seekToSeconds: isOutside ? startSeconds : null,
    shouldUpdate: true,
  };
};
