import { buildDriveMediaUrl } from '@org/google-drive';
import type { SheetMusicSource } from '@org/audio-library-models';

import {
  inspectSheetMusicBytes,
  type SheetMusicContentProblem,
  type SheetMusicContentFormat,
} from './sheet-music-content';

export type SheetMusicLoadFailureReason =
  /** The caller cancelled; not an error to show. */
  | 'aborted'
  | 'needs-drive-access'
  | 'not-found'
  /** A web host that does not allow browser requests (CORS). */
  | 'blocked'
  | 'too-large'
  /** Not a format the viewer shows. */
  | 'unsupported'
  /** The bytes are not what the link claims; the reason picks the failure copy. */
  | SheetMusicContentProblem
  | 'offline'
  | 'unavailable';

export type SheetMusicLoadResult =
  | {
      bytes: Uint8Array;
      format: SheetMusicContentFormat;
      /** True for a `.mxl` the renderer must unzip. */
      isCompressed: boolean;
      status: 'loaded';
    }
  | { reason: SheetMusicLoadFailureReason; status: 'failed' };

/** Never throws: every failure is a typed result the viewer maps to a next step. */
export type SheetMusicLoader = {
  load(
    source: SheetMusicSource,
    options?: { signal?: AbortSignal },
  ): Promise<SheetMusicLoadResult>;
};

type FetchLike = (
  input: string,
  init?: {
    headers?: Record<string, string>;
    mode?: 'no-cors';
    signal?: AbortSignal;
  },
) => Promise<{
  arrayBuffer(): Promise<ArrayBuffer>;
  headers?: { get(name: string): string | null };
  ok: boolean;
  status: number;
}>;

export type SheetMusicLoaderDependencies = {
  /**
   * True where the browser enforces CORS (web). A failed link request is then
   * probed to tell a blocked host from an unreachable one; native has no CORS.
   */
  checksCors: boolean;
  fetch: FetchLike;
  /** The current Drive access token, or undefined when not signed in. */
  getDriveAccessToken: () => string | undefined;
  maxBytes?: number;
  timeoutMs?: number;
};

export const SHEET_MUSIC_TIMEOUT_MS = 30_000;
export const SHEET_MUSIC_MAX_BYTES = 25 * 1024 * 1024;

const CONTENT_LENGTH_HEADER = 'content-length';
const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const GONE_STATUS = 410;

const failed = (reason: SheetMusicLoadFailureReason): SheetMusicLoadResult => ({
  reason,
  status: 'failed',
});

const resolveRequest = (
  source: SheetMusicSource,
  accessToken: string | undefined,
): { headers?: Record<string, string>; url: string } | null => {
  if (source.location.kind === 'url') {
    return { url: source.location.url };
  }

  return accessToken
    ? {
        headers: { Authorization: `Bearer ${accessToken}` },
        url: buildDriveMediaUrl(source.location.fileId),
      }
    : null;
};

const mapHttpFailure = (
  source: SheetMusicSource,
  status: number,
): SheetMusicLoadFailureReason => {
  if (status === NOT_FOUND_STATUS || status === GONE_STATUS) {
    return 'not-found';
  }

  const isAccessDenied =
    status === UNAUTHORIZED_STATUS || status === FORBIDDEN_STATUS;

  return isAccessDenied && source.location.kind === 'drive'
    ? 'needs-drive-access'
    : 'unavailable';
};

const isLoadableFormat = (
  format: SheetMusicSource['format'],
): format is SheetMusicContentFormat => {
  return format === 'pdf' || format === 'musicxml' || format === 'midi';
};

export const createSheetMusicLoader = (
  dependencies: SheetMusicLoaderDependencies,
): SheetMusicLoader => {
  const timeoutMs = dependencies.timeoutMs ?? SHEET_MUSIC_TIMEOUT_MS;
  const maxBytes = dependencies.maxBytes ?? SHEET_MUSIC_MAX_BYTES;

  // On the web, a CORS block and an unreachable host both reject with the same
  // TypeError. A `no-cors` request resolves (opaque) for a host that answered,
  // so resolving means the browser blocked the real request (spike 9.5).
  const classifyNetworkFailure = async (
    url: string,
    signal: AbortSignal,
  ): Promise<SheetMusicLoadFailureReason> => {
    if (!dependencies.checksCors) {
      return 'offline';
    }

    try {
      await dependencies.fetch(url, { mode: 'no-cors', signal });

      return 'blocked';
    } catch {
      return 'offline';
    }
  };

  return {
    async load(source, loadOptions) {
      if (!isLoadableFormat(source.format)) {
        return failed('unsupported');
      }

      const request = resolveRequest(
        source,
        dependencies.getDriveAccessToken(),
      );

      if (!request) {
        return failed('needs-drive-access');
      }

      const controller = new AbortController();
      const callerSignal = loadOptions?.signal;
      let timedOut = false;
      const onCallerAbort = () => controller.abort();
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      if (callerSignal?.aborted) {
        clearTimeout(timer);
        return failed('aborted');
      }

      callerSignal?.addEventListener('abort', onCallerAbort);

      try {
        const response = await dependencies.fetch(request.url, {
          ...(request.headers ? { headers: request.headers } : {}),
          signal: controller.signal,
        });

        if (!response.ok) {
          return failed(mapHttpFailure(source, response.status));
        }

        const declaredBytes = Number(
          response.headers?.get(CONTENT_LENGTH_HEADER),
        );

        if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
          return failed('too-large');
        }

        const bytes = new Uint8Array(await response.arrayBuffer());

        if (bytes.byteLength > maxBytes) {
          return failed('too-large');
        }

        const check = inspectSheetMusicBytes(source.format, bytes);

        return check.isValid
          ? {
              bytes,
              format: source.format,
              isCompressed: check.isCompressed,
              status: 'loaded',
            }
          : failed(check.reason);
      } catch (error) {
        if (callerSignal?.aborted && !timedOut) {
          return failed('aborted');
        }

        if (timedOut) {
          return failed('unavailable');
        }

        // `fetch` rejects with a TypeError when the request never completed.
        // For a link on the web that can also be a host that refuses browser
        // requests, so it is probed; anything else is just no connection.
        if (!(error instanceof TypeError)) {
          return failed('unavailable');
        }

        return failed(
          source.location.kind === 'url'
            ? await classifyNetworkFailure(request.url, controller.signal)
            : 'offline',
        );
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener('abort', onCallerAbort);
      }
    },
  };
};
