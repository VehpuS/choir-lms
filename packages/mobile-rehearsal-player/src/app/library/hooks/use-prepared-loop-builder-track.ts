import type { DriveAuthorizationState } from '@org/google-drive';
import { getDriveAudioSource } from '@org/google-drive';
import { useEffect, useRef, useState } from 'react';

import { runtimeConfig } from '../../../config/runtime';
import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import {
  hydrateLoopBuilderTrackDuration,
  resolveLoopBuilderTrackDuration,
  resolveSourcesMissingLoopBuilderDuration,
  resolveLoopBuilderTrack,
} from '../utils/saved-loop-view-model';
import type { PlayableItem } from '@org/audio-library-models';

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

  const requestSourceDuration = async (
    source: DriveLibrarySource,
    requestOptions?: {
      retryFailedLookup?: boolean;
      showPending?: boolean;
    },
  ) => {
    const cachedDurationMs = resolvedDurationsBySourceId[source.id];

    if (source.durationMs !== undefined) {
      return source.durationMs;
    }

    if (
      cachedDurationMs !== undefined &&
      (cachedDurationMs !== null || !requestOptions?.retryFailedLookup)
    ) {
      return cachedDurationMs;
    }

    if (
      options.authState.status !== 'authorized' ||
      !options.authState.accessToken
    ) {
      return cachedDurationMs;
    }

    if (requestOptions?.showPending) {
      setPendingSourceId(source.id);
    }

    try {
      const refreshedSource = await getDriveAudioSource({
        accessToken: options.authState.accessToken,
        driveFileId: source.driveFileId,
        supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
        supportedExtensions: runtimeConfig.supportedAudioExtensions,
      });
      const resolvedDurationMs = refreshedSource.durationMs ?? null;

      setResolvedDurationsBySourceId((currentDurations) => {
        return {
          ...currentDurations,
          [source.id]: resolvedDurationMs,
        };
      });

      if (typeof refreshedSource.durationMs === 'number') {
        options.persistResolvedSourceDuration(
          source.id,
          refreshedSource.durationMs,
        );
      }

      if (resolvedDurationMs !== null) {
        return resolvedDurationMs;
      }

      if (requestOptions?.showPending) {
        return probeSourceDurationFromPlayer(source);
      }

      return resolvedDurationMs;
    } catch {
      setResolvedDurationsBySourceId((currentDurations) => {
        return {
          ...currentDurations,
          [source.id]: null,
        };
      });

      if (requestOptions?.showPending) {
        return probeSourceDurationFromPlayer(source);
      }

      return null;
    } finally {
      if (requestOptions?.showPending) {
        setPendingSourceId((currentSourceId) => {
          return currentSourceId === source.id ? null : currentSourceId;
        });
      }
    }
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
