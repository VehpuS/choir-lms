const DEFAULT_QUEUE_POSITION = 1;

const getQueueSliderNumber = (value: number | number[]) => {
  return Array.isArray(value) ? (value[0] ?? DEFAULT_QUEUE_POSITION) : value;
};

export const clampQueuePosition = (position: number, itemCount: number) => {
  const maximumPosition = Math.max(DEFAULT_QUEUE_POSITION, itemCount);

  if (!Number.isFinite(position)) {
    return DEFAULT_QUEUE_POSITION;
  }

  return Math.min(
    Math.max(Math.round(position), DEFAULT_QUEUE_POSITION),
    maximumPosition,
  );
};

export const resolveQueueMoveTargetIndex = (options: {
  itemCount: number;
  sliderValue: number | number[];
}) => {
  return (
    clampQueuePosition(
      getQueueSliderNumber(options.sliderValue),
      options.itemCount,
    ) - DEFAULT_QUEUE_POSITION
  );
};
