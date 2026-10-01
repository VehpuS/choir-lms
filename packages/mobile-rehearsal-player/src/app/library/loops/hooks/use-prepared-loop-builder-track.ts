import type { DriveAuthorizationState } from '@org/google-drive';
import { getDriveAudioSource } from '@org/google-drive';
import { useEffect, useRef, useState } from 'react';

import type { PlayableItem } from '@org/audio-library-models';
import { runtimeConfig } from '../../../../config/runtime';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { requestLoopBuilderSourceDuration } from '../utils/request-loop-builder-source-duration';
import {
  hydrateLoopBuilderTrackDuration,
  resolveLoopBuilderTrack,
  resolveLoopBuilderTrackDuration,
  resolveSourcesMissingLoopBuilderDuration,
} from '../utils/saved-loop-view-model';

type UsePreparedLoopBuilderTrackOptions = {
  activePlayableItem: PlayableItem | null;
  authState: DriveAuthorizationState;
  playbackDurationSeconds: number;
  persistResolvedSourceDuration: (sourceId: string, durationMs: number) => void;
  resolveTrackDuration: (playableItem: PlayableItem) => Promise<number | null>;
  savedSources: DriveLibrarySource[];
  selectedSourceId: string | null;
};

export const usePreparedLoopBuilderTrack = (
  options: UsePreparedLoopBuilderTrackOptions,
) => {
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [resolvedDurationsBySourceId, setResolvedDurationsBySourceId] =
    useState<Partial<Record<string, number | null>>>({});
  const lastPrefetchedAccessTokenRef = useRef<string | null>(null);
  const baseSelectedTrack = resolveLoopBuilderTrack({
    savedSources: options.savedSources,
    selectedSourceId: options.selectedSourceId,
  });
  const selectedTrackDurationMs = resolveLoopBuilderTrackDuration({
    activePlayableItem: options.activePlayableItem,
    playbackDurationSeconds: options.playbackDurationSeconds,
    resolvedDurationMs: options.selectedSourceId
      ? resolvedDurationsBySourceId[options.selectedSourceId]
      : undefined,
    selectedTrack: baseSelectedTrack,
  });
  const selectedTrack = hydrateLoopBuilderTrackDuration(
    baseSelectedTrack,
    selectedTrackDurationMs,
  );

  const probeSourceDurationFromPlayer = async (source: DriveLibrarySource) => {
    if (!options.authState.accessToken) {
      return null;
    }

    const probePlayableItem = resolveLoopBuilderTrack({
      savedSources: [source],
      selectedSourceId: source.id,
    });

    if (!probePlayableItem) {
      return null;
    }

    const probedDurationMs =
      await options.resolveTrackDuration(probePlayableItem);

    setResolvedDurationsBySourceId((currentDurations) => {
      return {
        ...currentDurations,
        [source.id]: probedDurationMs,
      };
    });

    if (typeof probedDurationMs === 'number') {
      options.persistResolvedSourceDuration(source.id, probedDurationMs);
    }

    return probedDurationMs;
  };

  const requestSourceDuration = (
    source: DriveLibrarySource,
    requestOptions?: {
      retryFailedLookup?: boolean;
      showPending?: boolean;
    },
  ) => {
    return requestLoopBuilderSourceDuration(source, requestOptions, {
      cachedDurationMs: resolvedDurationsBySourceId[source.id],
      canRequest:
        options.authState.status === 'authorized' &&
        Boolean(options.authState.accessToken),
      fetchDriveDurationMs: async () => {
        const refreshedSource = await getDriveAudioSource({
          accessToken: options.authState.accessToken ?? '',
          driveFileId: source.driveFileId,
          supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
          supportedExtensions: runtimeConfig.supportedAudioExtensions,
        });

        return refreshedSource.durationMs ?? null;
      },
      onPendingChange: (pendingId) => {
        // Clearing only clears this source's own flag.
        setPendingSourceId((currentSourceId) => {
          return pendingId === null && currentSourceId !== source.id
            ? currentSourceId
            : pendingId;
        });
      },
      onResolved: (durationMs) => {
        setResolvedDurationsBySourceId((currentDurations) => {
          return { ...currentDurations, [source.id]: durationMs };
        });
      },
      persistDurationMs: (durationMs) => {
        options.persistResolvedSourceDuration(source.id, durationMs);
      },
      probeDurationMs: () => probeSourceDurationFromPlayer(source),
    });
  };

  useEffect(() => {
    if (
      options.activePlayableItem?.kind !== 'track' ||
      options.playbackDurationSeconds <= 0 ||
      resolvedDurationsBySourceId[options.activePlayableItem.sourceId] ===
        Math.round(options.playbackDurationSeconds * 1000)
    ) {
      return;
    }

    const activeTrackSourceId = options.activePlayableItem.sourceId;
    const resolvedDurationMs = Math.round(
      options.playbackDurationSeconds * 1000,
    );

    setResolvedDurationsBySourceId((currentDurations) => {
      if (currentDurations[activeTrackSourceId] === resolvedDurationMs) {
        return currentDurations;
      }

      return {
        ...currentDurations,
        [activeTrackSourceId]: resolvedDurationMs,
      };
    });
    options.persistResolvedSourceDuration(
      activeTrackSourceId,
      resolvedDurationMs,
    );
  }, [
    options.activePlayableItem,
    options.persistResolvedSourceDuration,
    options.playbackDurationSeconds,
    resolvedDurationsBySourceId,
  ]);

  useEffect(() => {
    if (
      options.authState.status !== 'authorized' ||
      !options.authState.accessToken
    ) {
      lastPrefetchedAccessTokenRef.current = null;
      return;
    }

    if (
      lastPrefetchedAccessTokenRef.current === options.authState.accessToken
    ) {
      return;
    }

    lastPrefetchedAccessTokenRef.current = options.authState.accessToken;

    const sourcesMissingDuration = resolveSourcesMissingLoopBuilderDuration({
      resolvedDurationsBySourceId,
      retryFailedLookup: true,
      savedSources: options.savedSources,
    });

    if (sourcesMissingDuration.length === 0) {
      return;
    }

    let isDisposed = false;

    void (async () => {
      for (const source of sourcesMissingDuration) {
        if (isDisposed) {
          return;
        }

        await requestSourceDuration(source, {
          retryFailedLookup: true,
        });
      }
    })();

    return () => {
      isDisposed = true;
    };
  }, [
    options.authState.accessToken,
    options.authState.status,
    options.savedSources,
    resolvedDurationsBySourceId,
  ]);

  const prepareLoopBuilderTrack = async (source: DriveLibrarySource) => {
    await requestSourceDuration(source, {
      retryFailedLookup: true,
      showPending: true,
    });
  };

  return {
    pendingSourceId,
    prepareLoopBuilderTrack,
    selectedTrack,
  };
};
