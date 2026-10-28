import type { RefObject } from 'react';
import type { View } from 'react-native';

type UseWheelScroll = (
  surfaceRef: RefObject<View | null>,
  onScrollBy: (delta: number) => void,
) => void;

/**
 * There is no wheel on native (the minimap scrolls the keys), so this does
 * nothing; the web file attaches the listener.
 */
export const useWheelScroll: UseWheelScroll = () => undefined;
