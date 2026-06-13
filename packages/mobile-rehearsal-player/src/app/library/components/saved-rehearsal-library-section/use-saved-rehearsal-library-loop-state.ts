import { type NamedLoop, type PlayableItem } from '@org/audio-library-models';
import { useEffect, useMemo, useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  getTrackScopedLoopDetailCopy,
  buildTrackScopedLoopPlaybackPlaylist,
} from '../../loops/utils/track-scoped-loop-view-model';
import {
  getPlaylistPlaybackActionCopy,
  type PlaylistPlaybackSession,
} from '../../playlists/utils/saved-playlist-playback-view-model';
import { getSavedRehearsalLibraryDependentLoops } from '../../utils/saved-rehearsal-library-view-model';

type UseSavedRehearsalLibraryLoopStateOptions = {
  activePlaylistSession: PlaylistPlaybackSession | null;
  canMutateLoops: boolean;
  isLibrarySearchMode: boolean;
  isLoopMutating: boolean;
  isPlaybackPreparing: boolean;
  openLoopBuilderForSource: (source: DriveLibrarySource) => void;
  pendingLoopBuilderSourceId: string | null;
  playbackState: Parameters<
    typeof getPlaylistPlaybackActionCopy
  >[0]['playbackState'];
  savedLibrarySources: DriveLibrarySource[];
  savedLoops: NamedLoop[];
  selectedTrack: PlayableItem | null;
  setSelectedLoopSourceId: (sourceId: string | null) => void;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: ReturnType<typeof buildTrackScopedLoopPlaybackPlaylist>;
    sources: DriveLibrarySource[];
    startEntryId?: string;
  }) => Promise<void>;
};

export const useSavedRehearsalLibraryLoopState = ({
  activePlaylistSession,
  canMutateLoops,
  isLibrarySearchMode,
  isLoopMutating,
  isPlaybackPreparing,
  openLoopBuilderForSource,
  pendingLoopBuilderSourceId,
  playbackState,
  savedLibrarySources,
  savedLoops,
  selectedTrack,
  setSelectedLoopSourceId,
  togglePlaylistPlayback,
}: UseSavedRehearsalLibraryLoopStateOptions) => {
  const [selectedLoopEditId, setSelectedLoopEditId] = useState<string | null>(
    null,
  );
  const [selectedLoopViewSourceId, setSelectedLoopViewSourceId] = useState<
    string | null
  >(null);

  const selectedLoopEdit =
    savedLoops.find((loop) => {
      return loop.id === selectedLoopEditId;
    }) ?? null;
  const selectedLoopViewSource =
    savedLibrarySources.find((source) => {
      return source.id === selectedLoopViewSourceId;
    }) ?? null;
  const selectedLoopViewLoops = useMemo(() => {
    if (!selectedLoopViewSourceId) {
      return [];
    }

    return getSavedRehearsalLibraryDependentLoops(
      savedLoops,
      selectedLoopViewSourceId,
    );
  }, [savedLoops, selectedLoopViewSourceId]);
  const selectedTrackLoopPlaybackPlaylist = useMemo(() => {
    if (!selectedLoopViewSource) {
      return null;
    }

    return buildTrackScopedLoopPlaybackPlaylist({
      loops: selectedLoopViewLoops,
      source: selectedLoopViewSource,
    });
  }, [selectedLoopViewLoops, selectedLoopViewSource]);
  const selectedTrackLoopSession =
    selectedTrackLoopPlaybackPlaylist &&
    activePlaylistSession?.playlistId === selectedTrackLoopPlaybackPlaylist.id
      ? activePlaylistSession
      : null;
  const currentLoopBuilderSourceId = selectedTrack?.source.id ?? null;

  useEffect(() => {
    if (selectedLoopEditId === null) {
      return;
    }

    const hasSelectedLoop = savedLoops.some((loop) => {
      return loop.id === selectedLoopEditId;
    });

    if (!hasSelectedLoop) {
      setSelectedLoopEditId(null);
    }
  }, [savedLoops, selectedLoopEditId]);

  useEffect(() => {
    if (!isLibrarySearchMode || selectedLoopViewSourceId === null) {
      return;
    }

    setSelectedLoopViewSourceId(null);
  }, [isLibrarySearchMode, selectedLoopViewSourceId]);

  useEffect(() => {
    if (selectedLoopViewSourceId === null) {
      return;
    }

    const hasSelectedSource = savedLibrarySources.some((source) => {
      return source.id === selectedLoopViewSourceId;
    });
    const hasTrackScopedLoops =
      getSavedRehearsalLibraryDependentLoops(
        savedLoops,
        selectedLoopViewSourceId,
      ).length > 0;

    if (
      !hasSelectedSource ||
      (!hasTrackScopedLoops &&
        currentLoopBuilderSourceId !== selectedLoopViewSourceId)
    ) {
      setSelectedLoopViewSourceId(null);
    }
  }, [
    currentLoopBuilderSourceId,
    savedLibrarySources,
    savedLoops,
    selectedLoopViewSourceId,
  ]);

  const selectedTrackLoopDetailCopy = selectedLoopViewSource
    ? getTrackScopedLoopDetailCopy({
        loopCount: selectedLoopViewLoops.length,
        sourceName: selectedLoopViewSource.name,
      })
    : null;
  const selectedTrackLoopPlaybackAction = getPlaylistPlaybackActionCopy({
    activeSession: selectedTrackLoopSession,
    isPreparing: isPlaybackPreparing,
    mode: 'ordered',
    playbackState,
    selectedPlaylist: selectedTrackLoopPlaybackPlaylist,
  });

  return {
    closeLoopBuilder() {
      setSelectedLoopEditId(null);
      setSelectedLoopSourceId(null);
    },
    openLoopEditor(loop: NamedLoop) {
      const source = savedLibrarySources.find((savedSource) => {
        return savedSource.id === loop.sourceId;
      });

      if (!source) {
        return;
      }

      setSelectedLoopEditId(loop.id);
      openLoopBuilderForSource(source);
    },
    openTrackLoopView(sourceId: string) {
      setSelectedLoopEditId(null);
      setSelectedLoopViewSourceId(sourceId);
    },
    selectedLoopEdit,
    selectedLoopViewSourceId,
    trackLoopView:
      selectedLoopViewSource && selectedTrackLoopDetailCopy
        ? {
            detailCopy: selectedTrackLoopDetailCopy,
            isMakeNewLoopDisabled:
              !canMutateLoops ||
              isLoopMutating ||
              pendingLoopBuilderSourceId !== null ||
              selectedLoopViewSource.availability.status !== 'available',
            loops: selectedLoopViewLoops,
            makeNewLoopLabel:
              pendingLoopBuilderSourceId === selectedLoopViewSource.id
                ? 'Preparing loop…'
                : 'Make new loop',
            onClose: () => {
              if (currentLoopBuilderSourceId === selectedLoopViewSourceId) {
                setSelectedLoopSourceId(null);
              }

              setSelectedLoopEditId(null);
              setSelectedLoopViewSourceId(null);
            },
            onMakeNewLoop: () => {
              setSelectedLoopEditId(null);
              openLoopBuilderForSource(selectedLoopViewSource);
            },
            onPlayLoopSeries: (loopId?: string) => {
              if (!selectedTrackLoopPlaybackPlaylist) {
                return;
              }

              const startEntryId = loopId
                ? selectedTrackLoopPlaybackPlaylist.items.find((entry) => {
                    return entry.loopId === loopId;
                  })?.id
                : undefined;

              void togglePlaylistPlayback({
                loops: savedLoops,
                mode: 'ordered',
                playlist: selectedTrackLoopPlaybackPlaylist,
                sources: savedLibrarySources,
                startEntryId,
              });
            },
            orderedPlaybackAction: selectedTrackLoopPlaybackAction,
          }
        : null,
  };
};
