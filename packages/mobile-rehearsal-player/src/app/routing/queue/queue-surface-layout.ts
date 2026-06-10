const MIN_QUEUE_LIST_MAX_HEIGHT = 220;
const MAX_QUEUE_LIST_MAX_HEIGHT = 320;
const QUEUE_LIST_HEIGHT_RATIO = 0.36;

export const getQueueListMaxHeight = (windowHeight: number) => {
  if (!Number.isFinite(windowHeight) || windowHeight <= 0) {
    return MIN_QUEUE_LIST_MAX_HEIGHT;
  }

  return Math.min(
    MAX_QUEUE_LIST_MAX_HEIGHT,
    Math.max(
      MIN_QUEUE_LIST_MAX_HEIGHT,
      Math.round(windowHeight * QUEUE_LIST_HEIGHT_RATIO),
    ),
  );
};
