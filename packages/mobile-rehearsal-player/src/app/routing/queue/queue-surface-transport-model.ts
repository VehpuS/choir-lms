import type { SurfaceIconButtonProps } from '../../components/surface-icon-button';

export type QueueSurfaceTransportAction = Pick<
  SurfaceIconButtonProps,
  'accessibilityLabel' | 'disabled' | 'icon'
> & {
  key: 'previous' | 'next';
};

export const getQueueSurfaceTransportActions = (options: {
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
}): QueueSurfaceTransportAction[] => {
  return [
    {
      accessibilityLabel: 'Previous queue item',
      disabled: !options.canSkipPreviousItem,
      icon: 'skip-previous',
      key: 'previous',
    },
    {
      accessibilityLabel: 'Next queue item',
      disabled: !options.canSkipNextItem,
      icon: 'skip-next',
      key: 'next',
    },
  ];
};
