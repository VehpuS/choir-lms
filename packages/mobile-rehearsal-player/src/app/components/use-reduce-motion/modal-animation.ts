import type { ModalProps } from 'react-native';

export type ModalAnimation = ModalProps['animationType'];

/**
 * The transition a modal should use: its own, or none when the person asked
 * the system for less motion (a sheet then appears and closes at once).
 */
export const resolveModalAnimation = (
  animation: ModalAnimation,
  reduceMotion: boolean,
): ModalAnimation => (reduceMotion ? 'none' : animation);
