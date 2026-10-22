import type { PlayableItem } from '@org/audio-library-models';

import {
  useHasLyrics,
  useIsPlayableItemSaved,
} from '../../../library/components/saved-item-menu/saved-item-availability-context';
import {
  ADD_MARKER_HERE_LABEL,
  requestSavedItemAction,
  resolveSavedItemShortcuts,
} from '../../../library/components/saved-item-menu/saved-item-requests';
import { requestLoopBuilder } from '../../../library/loops/utils/loop-builder-request';
import {
  resolveNowPlayingAddMarkerRequest,
  resolveNowPlayingMakeLoopRequest,
} from './now-playing-menu-model';

/**
 * The playback overflow's actions: the Library's item actions, `Make loop`
 * from the playhead in place of the plain one (task 8.26), and `Add marker
 * here` right after `Markers`, ahead of the loop and removal actions.
 */
export const useNowPlayingMenuActions = (options: {
  activePlayableItem: PlayableItem;
  closeMenu: () => void;
  playbackPositionSeconds: number;
}) => {
  const { activePlayableItem, closeMenu } = options;
  const makeLoopRequest = resolveNowPlayingMakeLoopRequest({
    activePlayableItem,
    playbackPositionSeconds: options.playbackPositionSeconds,
  });
  const isSaved = useIsPlayableItemSaved(activePlayableItem);
  const addMarkerRequest = resolveNowPlayingAddMarkerRequest({
    activePlayableItem,
    isSaved,
  });
  const hasLyrics = useHasLyrics(activePlayableItem);

  return [
    ...(makeLoopRequest
      ? [
          {
            id: 'make-loop',
            label: 'Make loop',
            onPress: () => {
              closeMenu();
              requestLoopBuilder(makeLoopRequest);
            },
          },
        ]
      : []),
    ...resolveSavedItemShortcuts({
      hasLyrics,
      isSaved,
      item: activePlayableItem,
    })
      .filter(({ id }) => !(makeLoopRequest && id === 'make-loop'))
      .flatMap((shortcut) => {
        const action = {
          id: shortcut.id,
          label: shortcut.label,
          onPress: () => {
            closeMenu();
            requestSavedItemAction(shortcut.request);
          },
          tone: shortcut.tone,
        };

        return shortcut.id === 'markers' && addMarkerRequest
          ? [
              action,
              {
                id: 'add-marker-here',
                label: ADD_MARKER_HERE_LABEL,
                onPress: () => {
                  closeMenu();
                  requestSavedItemAction(addMarkerRequest);
                },
                tone: undefined,
              },
            ]
          : [action];
      }),
  ];
};
