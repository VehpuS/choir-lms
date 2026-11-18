import type { PlayableItem } from '@org/audio-library-models';
import { useEffect, useRef } from 'react';

import type { PlaylistPlaybackSession } from '../../playlists/utils/saved-playlist-playback-view-model';
import { getListeningAudio } from './create-listening-engine-loader';
import {
  getListeningRuleState,
  useListeningRuleKey,
} from './listening-rule-state';
import {
  createPrepareAhead,
  resolveTrackToPrepareAhead,
  type PrepareAhead,
} from './prepare-ahead';

/** Prepares the next track of the queue while the current one plays with a microphone open. */
export const usePrepareAhead = (options: {
  accessToken: string | null;
  activeItem: PlayableItem | null;
  session: PlaylistPlaybackSession | null;
}) => {
  const ruleKey = useListeningRuleKey();
  const prepareAheadRef = useRef<PrepareAhead | null>(null);
  const { accessToken, activeItem, session } = options;

  useEffect(() => {
    prepareAheadRef.current ??= createPrepareAhead(getListeningAudio().prepare);
    prepareAheadRef.current.sync({
      accessToken,
      activeTrackId: activeItem?.source.id ?? null,
      next: resolveTrackToPrepareAhead({
        activeItem,
        session,
        ruleState: getListeningRuleState(),
      }),
    });
    // `ruleKey` stands for the rule state read above.
  }, [accessToken, activeItem, ruleKey, session]);
};
