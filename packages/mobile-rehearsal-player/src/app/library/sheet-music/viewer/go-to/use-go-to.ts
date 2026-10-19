import { useCallback, useState } from 'react';

/** A request to scroll the score to a bar; `token` makes a repeat of the same bar a new request. */
export type GoToJump = { barIndex: number; token: number };

/**
 * The state of the `Go to` drawer: whether it is open, and the latest jump.
 * Jumping closes the drawer so the score has the whole screen again.
 */
export const useGoTo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [jump, setJump] = useState<GoToJump>();

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  const jumpTo = useCallback((barIndex: number) => {
    setJump((current) => ({ barIndex, token: (current?.token ?? 0) + 1 }));
    setIsOpen(false);
  }, []);

  return { close, isOpen, jump, jumpTo, open };
};
