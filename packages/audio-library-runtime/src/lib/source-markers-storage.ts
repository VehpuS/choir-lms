import {
  MAX_TRACK_MARKERS,
  nextAutomaticMarkerName,
  normalizeMarkerName,
  parseTrackMarkers,
  type DriveAudioSource,
  type TrackMarker,
} from '@org/audio-library-models';
import { omit } from 'es-toolkit/compat';

import { writeStoredCollection } from './practice-repository-storage';

type MarkersRepository = {
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
};

export type MarkerWriteStatus =
  | 'ok'
  | 'not-found'
  | 'marker-not-found'
  | 'limit-reached'
  | 'invalid-name'
  | 'invalid-position';

export type MarkerWriteResult = {
  status: MarkerWriteStatus;
  sources: DriveAudioSource[];
  /** The marker that was added or changed, when the write succeeded. */
  marker?: TrackMarker;
};

/**
 * `id` and `createdAt` are only supplied to restore a deleted marker (undo),
 * which re-adds it exactly as it was. `name` falls back to `Marker N`.
 */
export type MarkerAddition = {
  positionMs: number;
  name?: string;
  id?: string;
  createdAt?: string;
};

const createMarkerId = () =>
  `marker:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isUsablePosition = (positionMs: number): boolean => {
  return Number.isFinite(positionMs) && positionMs >= 0;
};

/** A moved marker stays inside the audio when its length is known. */
const clampPosition = (positionMs: number, durationMs?: number): number => {
  const rounded = Math.round(positionMs);

  return durationMs === undefined ? rounded : Math.min(rounded, durationMs);
};

type MarkerEdit =
  | { status: 'ok'; markers: TrackMarker[]; marker: TrackMarker }
  | { status: Exclude<MarkerWriteStatus, 'ok' | 'not-found'> };

/**
 * Applies one edit to a single track's `markers` list and writes only that
 * field. The result goes back through the storage parser so ordering, name
 * limits, and the 200 cap hold for every write; an empty list removes the
 * field, and an unknown track id leaves the library untouched.
 */
const editSourceMarkers = async (
  repository: MarkersRepository,
  ownerId: string,
  sourceId: string,
  edit: (source: DriveAudioSource, markers: TrackMarker[]) => MarkerEdit,
): Promise<MarkerWriteResult> => {
  const sources = await repository.listSources(ownerId);
  const target = sources.find((source) => source.id === sourceId);

  if (!target) {
    return { status: 'not-found', sources };
  }

  const result = edit(target, [...(target.markers ?? [])]);

  if (result.status !== 'ok') {
    return { status: result.status, sources };
  }

  const markers = parseTrackMarkers(result.markers);
  const nextSources = sources.map((source) => {
    if (source.id !== sourceId) {
      return source;
    }

    const sourceWithoutMarkers = omit(source, ['markers']);

    return markers
      ? { ...sourceWithoutMarkers, markers }
      : sourceWithoutMarkers;
  });

  await writeStoredCollection('sources', ownerId, nextSources);

  return { status: 'ok', sources: nextSources, marker: result.marker };
};

export const addMarkerToRepository = (
  repository: MarkersRepository,
  ownerId: string,
  sourceId: string,
  addition: MarkerAddition,
) =>
  editSourceMarkers(repository, ownerId, sourceId, (source, markers) => {
    if (!isUsablePosition(addition.positionMs)) {
      return { status: 'invalid-position' };
    }

    if (markers.length >= MAX_TRACK_MARKERS) {
      return { status: 'limit-reached' };
    }

    const typedName = normalizeMarkerName(addition.name ?? '');
    const marker: TrackMarker = {
      id: addition.id ?? createMarkerId(),
      name:
        typedName || nextAutomaticMarkerName(markers.map(({ name }) => name)),
      positionMs: clampPosition(addition.positionMs, source.durationMs),
      createdAt: addition.createdAt ?? new Date().toISOString(),
    };

    return { status: 'ok', markers: [...markers, marker], marker };
  });

const editExistingMarker = (
  repository: MarkersRepository,
  ownerId: string,
  sourceId: string,
  markerId: string,
  change: (marker: TrackMarker, source: DriveAudioSource) => TrackMarker | null,
) =>
  editSourceMarkers(repository, ownerId, sourceId, (source, markers) => {
    const current = markers.find(({ id }) => id === markerId);

    if (!current) {
      return { status: 'marker-not-found' };
    }

    const changed = change(current, source);

    if (!changed) {
      return { status: 'invalid-name' };
    }

    return {
      status: 'ok',
      markers: markers.map((marker) =>
        marker.id === markerId ? changed : marker,
      ),
      marker: changed,
    };
  });

export const renameMarkerInRepository = (
  repository: MarkersRepository,
  ownerId: string,
  sourceId: string,
  markerId: string,
  name: string,
) => {
  const nextName = normalizeMarkerName(name);

  return editExistingMarker(
    repository,
    ownerId,
    sourceId,
    markerId,
    (marker) => (nextName ? { ...marker, name: nextName } : null),
  );
};

export const moveMarkerInRepository = (
  repository: MarkersRepository,
  ownerId: string,
  sourceId: string,
  markerId: string,
  positionMs: number,
) =>
  isUsablePosition(positionMs)
    ? editExistingMarker(
        repository,
        ownerId,
        sourceId,
        markerId,
        (marker, source) => ({
          ...marker,
          positionMs: clampPosition(positionMs, source.durationMs),
        }),
      )
    : repository
        .listSources(ownerId)
        .then((sources) => ({ status: 'invalid-position' as const, sources }));

export const deleteMarkerFromRepository = (
  repository: MarkersRepository,
  ownerId: string,
  sourceId: string,
  markerId: string,
) =>
  editSourceMarkers(repository, ownerId, sourceId, (_source, markers) => {
    const removed = markers.find(({ id }) => id === markerId);

    if (!removed) {
      return { status: 'marker-not-found' };
    }

    return {
      status: 'ok',
      markers: markers.filter(({ id }) => id !== markerId),
      marker: removed,
    };
  });
