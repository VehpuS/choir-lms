import { Modal, type ModalProps } from 'react-native';

import { useReduceMotion } from '../use-reduce-motion';
import { resolveModalAnimation } from '../use-reduce-motion/modal-animation';

/**
 * A React Native `Modal` whose slide or fade is dropped when the person asked
 * the system for less motion, so every sheet and dialog opens and closes at
 * once under `prefers-reduced-motion`. Use it in place of `Modal`.
 */
export const MotionModal = ({ animationType, ...props }: ModalProps) => {
  const reduceMotion = useReduceMotion();

  return (
    <Modal
      {...props}
      animationType={resolveModalAnimation(animationType, reduceMotion)}
    />
  );
};
