const SAVED_TRACK_PLAYER_WEB_PATCH = Symbol('saved-track-player-web-patch');
const SAVED_TRACK_PLAYER_WEB_PLAYER_PATCH = Symbol(
  'saved-track-player-web-player-patch',
);

type SavedTrackPlayerWebTrack = {
  contentType?: string;
  headers?: Record<string, string>;
  url: string;
};

type SavedTrackPlayerWebRuntime = {
  add?: (
    tracks: SavedTrackPlayerWebTrack | SavedTrackPlayerWebTrack[],
    insertBeforeIndex?: number,
  ) => Promise<unknown>;
  load?: (track: SavedTrackPlayerWebTrack) => Promise<unknown>;
  reset?: () => Promise<unknown>;
  setupPlayer?: () => Promise<unknown>;
  stop?: () => Promise<unknown>;
};

type SavedTrackPlayerWebResponse = {
  blob(): Promise<Blob>;
  ok: boolean;
  status: number;
};

type SavedTrackPlayerWebMediaElement = {
  load(): void;
  removeAttribute?(name: string): void;
  src: string;
};

type SavedTrackPlayerWebPlayer = {
  [SAVED_TRACK_PLAYER_WEB_PLAYER_PATCH]?: boolean;
  getMediaElement?: () => SavedTrackPlayerWebMediaElement | null;
  load(url: string): Promise<unknown>;
};

type SavedTrackPlayerWebDependencies = {
  fetch: (
    input: string,
    init?: {
      headers?: Record<string, string>;
    },
  ) => Promise<SavedTrackPlayerWebResponse>;
  urlApi: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  windowApi: {
    rntp?: SavedTrackPlayerWebPlayer;
  };
};

type PatchedSavedTrackPlayerWebRuntime = SavedTrackPlayerWebRuntime & {
  [SAVED_TRACK_PLAYER_WEB_PATCH]?: boolean;
};

const getSavedTrackPlayerWebTrackHeaders = (
  track: SavedTrackPlayerWebTrack,
) => {
  const headers = track.headers ?? {};

  return Object.keys(headers).length > 0 ? headers : null;
};

const isSavedTrackPlayerBlobUrl = (url: string) => {
  return url.startsWith('blob:');
};

const fetchSavedTrackBlobUrl = async (
  track: SavedTrackPlayerWebTrack,
  dependencies: SavedTrackPlayerWebDependencies,
) => {
  const response = await dependencies.fetch(track.url, {
    headers: track.headers,
  });

  if (!response.ok) {
    throw new Error(
      `Web playback media request failed with ${response.status}.`,
    );
  }

  const trackBlob = await response.blob();

  return dependencies.urlApi.createObjectURL(trackBlob);
};

const patchSavedTrackPlayerWebTrack = async (
  track: SavedTrackPlayerWebTrack,
  dependencies: SavedTrackPlayerWebDependencies,
) => {
  const headers = getSavedTrackPlayerWebTrackHeaders(track);

  if (!headers) {
    return {
      blobUrls: [],
      track,
    };
  }

  const blobUrl = await fetchSavedTrackBlobUrl(track, dependencies);

  return {
    blobUrls: [blobUrl],
    track: {
      ...track,
      headers: {},
      url: blobUrl,
    },
  };
};

const patchSavedTrackPlayerWebTracks = async (
  tracks: SavedTrackPlayerWebTrack | SavedTrackPlayerWebTrack[],
  dependencies: SavedTrackPlayerWebDependencies,
) => {
  if (Array.isArray(tracks)) {
    const patchedTracks = await Promise.all(
      tracks.map(async (track) => {
        return patchSavedTrackPlayerWebTrack(track, dependencies);
      }),
    );

    return {
      blobUrls: patchedTracks.flatMap((track) => {
        return track.blobUrls;
      }),
      tracks: patchedTracks.map((track) => {
        return track.track;
      }),
    };
  }

  const patchedTrack = await patchSavedTrackPlayerWebTrack(
    tracks,
    dependencies,
  );

  return {
    blobUrls: patchedTrack.blobUrls,
    tracks: patchedTrack.track,
  };
};

const revokeSavedTrackBlobUrls = (
  blobUrls: string[],
  dependencies: SavedTrackPlayerWebDependencies,
) => {
  for (const blobUrl of blobUrls) {
    dependencies.urlApi.revokeObjectURL(blobUrl);
  }
};

const clearSavedTrackPlayerWebSource = (
  dependencies: SavedTrackPlayerWebDependencies,
) => {
  const mediaElement = dependencies.windowApi.rntp?.getMediaElement?.() ?? null;

  if (!mediaElement) {
    return;
  }

  if (typeof mediaElement.removeAttribute === 'function') {
    mediaElement.removeAttribute('src');
  } else {
    mediaElement.src = '';
  }

  mediaElement.load();
};

const patchSavedTrackPlayerBlobLoad = (
  dependencies: SavedTrackPlayerWebDependencies,
) => {
  const trackPlayerWebPlayer = dependencies.windowApi.rntp;

  if (
    !trackPlayerWebPlayer ||
    trackPlayerWebPlayer[SAVED_TRACK_PLAYER_WEB_PLAYER_PATCH]
  ) {
    return;
  }

  const originalLoad = trackPlayerWebPlayer.load.bind(trackPlayerWebPlayer);

  trackPlayerWebPlayer.load = async (url) => {
    if (!isSavedTrackPlayerBlobUrl(url)) {
      return originalLoad(url);
    }

    const mediaElement = trackPlayerWebPlayer.getMediaElement?.() ?? null;

    if (!mediaElement) {
      return originalLoad(url);
    }

    mediaElement.src = url;
    mediaElement.load();

    return undefined;
  };

  trackPlayerWebPlayer[SAVED_TRACK_PLAYER_WEB_PLAYER_PATCH] = true;
};

export const patchSavedTrackPlayerWebRuntime = (
  runtime: SavedTrackPlayerWebRuntime,
  dependencies: SavedTrackPlayerWebDependencies,
) => {
  const patchedRuntime = runtime as PatchedSavedTrackPlayerWebRuntime;

  if (patchedRuntime[SAVED_TRACK_PLAYER_WEB_PATCH]) {
    return;
  }

  patchedRuntime[SAVED_TRACK_PLAYER_WEB_PATCH] = true;

  let activeBlobUrls: string[] = [];

  const originalAdd = runtime.add?.bind(runtime);
  const originalLoad = runtime.load?.bind(runtime);
  const originalReset = runtime.reset?.bind(runtime);
  const originalSetupPlayer = runtime.setupPlayer?.bind(runtime);
  const originalStop = runtime.stop?.bind(runtime);

  if (originalSetupPlayer) {
    patchedRuntime.setupPlayer = async () => {
      const result = await originalSetupPlayer();

      patchSavedTrackPlayerBlobLoad(dependencies);

      return result;
    };
  }

  if (originalAdd) {
    patchedRuntime.add = async (tracks, insertBeforeIndex) => {
      patchSavedTrackPlayerBlobLoad(dependencies);

      const patchedTracks = await patchSavedTrackPlayerWebTracks(
        tracks,
        dependencies,
      );

      try {
        const result = await originalAdd(
          patchedTracks.tracks,
          insertBeforeIndex,
        );

        activeBlobUrls = [...activeBlobUrls, ...patchedTracks.blobUrls];

        return result;
      } catch (error) {
        revokeSavedTrackBlobUrls(patchedTracks.blobUrls, dependencies);
        throw error;
      }
    };
  }

  if (originalLoad) {
    patchedRuntime.load = async (track) => {
      patchSavedTrackPlayerBlobLoad(dependencies);

      const patchedTrack = await patchSavedTrackPlayerWebTrack(
        track,
        dependencies,
      );

      try {
        const result = await originalLoad(patchedTrack.track);
        const previousBlobUrls = activeBlobUrls;

        activeBlobUrls = patchedTrack.blobUrls;
        revokeSavedTrackBlobUrls(previousBlobUrls, dependencies);

        return result;
      } catch (error) {
        revokeSavedTrackBlobUrls(patchedTrack.blobUrls, dependencies);
        throw error;
      }
    };
  }

  if (originalReset) {
    patchedRuntime.reset = async () => {
      try {
        return await originalReset();
      } finally {
        clearSavedTrackPlayerWebSource(dependencies);
        revokeSavedTrackBlobUrls(activeBlobUrls, dependencies);
        activeBlobUrls = [];
      }
    };
  }

  if (originalStop) {
    patchedRuntime.stop = async () => {
      try {
        return await originalStop();
      } finally {
        clearSavedTrackPlayerWebSource(dependencies);
        revokeSavedTrackBlobUrls(activeBlobUrls, dependencies);
        activeBlobUrls = [];
      }
    };
  }
};
