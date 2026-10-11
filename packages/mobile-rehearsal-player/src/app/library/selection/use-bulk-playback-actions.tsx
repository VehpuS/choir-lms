import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
  Playlist,
} from '@org/audio-library-models';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import type { PlaylistDraftIssue } from '../playlists/utils/saved-playlist-view-model';
import { getSelectionCountLabel } from './selection-copy';
import {
  getBulkPlaybackAcknowledgment,
  getNothingPlayableAcknowledgment,
  prepareBulkPlayback,
  type BulkAcknowledgment,
} from './bulk-playback-run';
import { useBulkChoices } from './bulk-choices-prompt/use-bulk-choices';
import {
  appendRefsToPlaylist,
  buildPlaylistFromRefs,
} from './bulk-playlist-actions';
import {
  BulkPlaylistNameSheet,
  BulkPlaylistTargetSheet,
} from './bulk-playlist-sheets';
import {
  getBlockedPlaylistTargetIds,
  type BulkSelectionItem,
  type PlaybackExpansionContext,
  type PlaybackExpansionOptions,
} from './playback-expansion';

const CREATE_PLAYLIST_FAILED: PlaylistDraftIssue = {
  message: 'The playlist could not be created right now. Try again.',
  title: 'Could not create playlist',
};
const UPDATE_PLAYLIST_FAILED: PlaylistDraftIssue = {
  message: 'The playlist could not be updated right now. Nothing was added.',
  title: 'Could not add to playlist',
};

type UseBulkPlaybackActionsOptions = {
  /** Something is playing; `Play next` and `Add to queue` need a queue to join. */
  canQueue: boolean;
  collections: {
    loops: NamedLoop[];
    playlists: Playlist[];
    sources: DriveAudioSource[];
  };
  context: PlaybackExpansionContext;
  /** Files files the new playlist in the current folder; other views do not. */
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  /** The selection in display order. */
  items: readonly BulkSelectionItem[];
  onAcknowledge: (acknowledgment: BulkAcknowledgment) => void;
  /** Called after an action finished, so the surface can leave selection mode. */
  onCompleted: () => void;
  ownerId: string;
  queueItemsNext: (items: readonly PlayableItem[]) => void;
  queueItemsUpNext: (items: readonly PlayableItem[]) => void;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

/**
 * The four playback and playlist bulk actions (design Decision 10) shared by
 * every selection surface. Each settles the playlists-in-folders and
 * repeated-items questions first (9.5.1), then expands the selection in
 * display order and applies it as one block.
 */
export const useBulkPlaybackActions = ({
  canQueue,
  collections,
  context,
  createPlaylist,
  items,
  onAcknowledge,
  onCompleted,
  ownerId,
  queueItemsNext,
  queueItemsUpNext,
  updatePlaylist,
}: UseBulkPlaybackActionsOptions) => {
  const { prompt, resolveChoices } = useBulkChoices();
  const [pendingOptions, setPendingOptions] =
    useState<PlaybackExpansionOptions | null>(null);
  const [step, setStep] = useState<'idle' | 'name' | 'target'>('idle');
  const [draftName, setDraftName] = useState('');
  const [issue, setIssue] = useState<PlaylistDraftIssue | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // The count the actions are enabled by: playable audio under the default
  // choices, so the bar never offers an action that would do nothing.
  const effectivePlayableCount = useMemo(
    () =>
      prepareBulkPlayback({
        collections,
        context,
        expansionOptions: { playlists: 'skip', repeats: 'keep' },
        items,
      }).playableItems.length,
    [collections, context, items],
  );
  const blockedPlaylistIds = useMemo(
    () => getBlockedPlaylistTargetIds(items),
    [items],
  );

  const close = useCallback(() => {
    setStep('idle');
    setPendingOptions(null);
    setDraftName('');
    setIssue(null);
  }, []);

  const finish = useCallback(
    (acknowledgment: BulkAcknowledgment) => {
      close();
      onAcknowledge(acknowledgment);
      onCompleted();
    },
    [close, onAcknowledge, onCompleted],
  );

  const queueBlock = useCallback(
    async (action: 'add-to-queue' | 'play-next') => {
      const expansionOptions = await resolveChoices(items, context);

      if (!expansionOptions) {
        return;
      }

      const prepared = prepareBulkPlayback({
        collections,
        context,
        expansionOptions,
        items,
      });

      if (prepared.playableItems.length === 0) {
        onAcknowledge(getNothingPlayableAcknowledgment());
        return;
      }

      (action === 'play-next' ? queueItemsNext : queueItemsUpNext)(
        prepared.playableItems,
      );
      finish(
        getBulkPlaybackAcknowledgment({
          action,
          count: prepared.playableItems.length,
          leftOutCount: prepared.unavailableCount,
        }),
      );
    },
    [
      collections,
      context,
      finish,
      items,
      onAcknowledge,
      queueItemsNext,
      queueItemsUpNext,
      resolveChoices,
    ],
  );

  const startPlaylistStep = useCallback(
    async (nextStep: 'name' | 'target') => {
      const expansionOptions = await resolveChoices(items, context);

      if (!expansionOptions) {
        return;
      }

      setPendingOptions(expansionOptions);
      setIssue(null);
      setStep(nextStep);
    },
    [context, items, resolveChoices],
  );

  const getPendingRefs = useCallback(() => {
    if (!pendingOptions) {
      return [];
    }

    return prepareBulkPlayback({
      collections,
      context,
      expansionOptions: pendingOptions,
      items,
    }).refs;
  }, [collections, context, items, pendingOptions]);

  const addToPlaylist = useCallback(
    async (playlist: Playlist) => {
      const refs = getPendingRefs();
      const result = appendRefsToPlaylist({
        playlist,
        refs,
        savedLoops: collections.loops,
        savedSources: collections.sources,
      });

      if (!result.playlist) {
        setIssue(result.issue ?? UPDATE_PLAYLIST_FAILED);
        return;
      }

      setIsMutating(true);
      const saved = await updatePlaylist(result.playlist);

      setIsMutating(false);

      if (!saved) {
        setIssue(UPDATE_PLAYLIST_FAILED);
        return;
      }

      finish(
        getBulkPlaybackAcknowledgment({
          action: 'add-to-playlist',
          count: refs.length - result.missingCount,
          leftOutCount: result.missingCount,
          playlistName: saved.name,
        }),
      );
    },
    [collections, finish, getPendingRefs, updatePlaylist],
  );

  const saveAsPlaylist = useCallback(async () => {
    const refs = getPendingRefs();
    const result = buildPlaylistFromRefs({
      name: draftName,
      ownerId,
      refs,
      savedLoops: collections.loops,
      savedSources: collections.sources,
    });

    if (!result.playlist) {
      setIssue(result.issue ?? CREATE_PLAYLIST_FAILED);
      return;
    }

    setIsMutating(true);
    const created = await createPlaylist(result.playlist);

    setIsMutating(false);

    if (!created) {
      setIssue(CREATE_PLAYLIST_FAILED);
      return;
    }

    finish(
      getBulkPlaybackAcknowledgment({
        action: 'save-as-playlist',
        count: refs.length - result.missingCount,
        leftOutCount: result.missingCount,
        playlistName: created.name,
      }),
    );
  }, [collections, createPlaylist, draftName, finish, getPendingRefs, ownerId]);

  const selectedCountLabel = getSelectionCountLabel(items.length);
  const nodes: ReactNode = (
    <>
      {prompt}
      <BulkPlaylistTargetSheet
        blockedPlaylistIds={blockedPlaylistIds}
        isMutating={isMutating}
        isVisible={step === 'target'}
        issue={issue}
        onClose={close}
        onSelectPlaylist={(playlist) => {
          void addToPlaylist(playlist);
        }}
        playlists={collections.playlists}
        selectedCountLabel={selectedCountLabel}
      />
      <BulkPlaylistNameSheet
        draftName={draftName}
        isMutating={isMutating}
        isVisible={step === 'name'}
        issue={issue}
        onChangeName={(name) => {
          setIssue(null);
          setDraftName(name);
        }}
        onClose={close}
        onSubmit={() => {
          void saveAsPlaylist();
        }}
        selectedCountLabel={selectedCountLabel}
      />
    </>
  );

  const run = useMemo(
    () => ({
      addToPlaylist: () => {
        void startPlaylistStep('target');
      },
      addToQueue: () => {
        void queueBlock('add-to-queue');
      },
      playNext: () => {
        void queueBlock('play-next');
      },
      saveAsPlaylist: () => {
        void startPlaylistStep('name');
      },
    }),
    [queueBlock, startPlaylistStep],
  );

  return { canQueue, effectivePlayableCount, nodes, run };
};
