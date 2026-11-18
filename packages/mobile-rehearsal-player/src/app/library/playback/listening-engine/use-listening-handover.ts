import { useEffect } from 'react';

import { useListeningRuleKey } from './listening-rule-state';

/**
 * Asks for a hand-over whenever the rule's state changes, and once a load has
 * settled (a track that loaded just before the microphone opened is on the
 * media element and needs to move).
 */
export const useListeningHandover = (options: {
  activeItemId: string | null;
  isPreparing: boolean;
  sync: () => Promise<void>;
}) => {
  const ruleKey = useListeningRuleKey();
  const { activeItemId, isPreparing, sync } = options;

  useEffect(() => {
    if (activeItemId !== null && !isPreparing) {
      void sync();
    }
  }, [activeItemId, isPreparing, ruleKey, sync]);
};
