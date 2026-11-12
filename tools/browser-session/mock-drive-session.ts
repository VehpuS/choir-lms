import type { BrowserContext, Route } from 'playwright';

import { fulfillMedia, type MockMedia } from './mock-media';
import {
  MOCK_DRIVE_USER,
  MockDriveStore,
  parseMultipartRelated,
} from './mock-drive-store';

// A stand-in for Google Drive, so the browser suite can run authorised and
// expired sessions, and back up, restore and share, without a real sign-in.
// Grow it when a test needs more: add a field to `MockDriveAccount` and a
// branch to the route.
//
// - Session: the app restores its sign-in from localStorage, so we seed it.
// - Drive API: `https://www.googleapis.com/drive/v3/**` and the upload address
//   are answered from an in-memory store (`mock-drive-store.ts`), which keeps
//   what the app creates, uploads, renames and deletes.
// - Sign-in: `https://accounts.google.com/**` serves a stub page, so pressing
//   Reconnect opens a window we can observe instead of leaving the machine.
const DRIVE_AUTH_SESSION_KEY = 'choirlms.google-drive.authorization';
const DRIVE_API_PATTERN = /^https:\/\/www\.googleapis\.com\/drive\/v3\//;
const DRIVE_UPLOAD_PATTERN =
  /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files/;
const DRIVE_UPLOAD_ADDRESS = 'https://www.googleapis.com/upload/drive/v3/files';
const SIGN_IN_PATTERN = /^https:\/\/accounts\.google\.com\//;
const DRIVE_FILE_PATH_PATTERN = /\/drive\/v3\/files\/([^/?]+)/;
const CONTENT_RANGE_PATTERN = /bytes (?:(\d+)-(\d+)|\*)\/(\d+|\*)/;
const MOCK_ACCESS_TOKEN = 'mock-drive-access-token';
const READ_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const AUTHORIZED_FOR_MS = 60 * 60 * 1000;
const NOT_FOUND_STATUS = 404;
const SIGN_IN_TOKEN_SECONDS = 3600;
const NO_CONTENT_STATUS = 204;
const OK_STATUS = 200;
const RESUME_INCOMPLETE_STATUS = 308;
const CORS_HEADERS = {
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-allow-origin': '*',
  'access-control-expose-headers': 'location, range',
};

export type MockDriveAccount =
  /** Never signed in: the app has no stored session. */
  | { state: 'signed-out'; completeSignIn?: boolean }
  /** Was signed in; the token ran out, so the app offers Reconnect. */
  | { state: 'expired'; completeSignIn?: boolean }
  | {
      state: 'authorized';
      /** Drive ids Drive answers 404 for, as for a file never shared with the user. */
      inaccessibleFileIds?: string[];
      /**
       * Files in the account, as Drive API objects: `id`, `name`, `mimeType`,
       * `parents` (default: My Drive's root), `size`, `owners`,
       * `sharedWithMe`, `appProperties`. Owned by the user unless `owners` says.
       */
      files?: unknown[];
      /** Bytes Drive serves for `files/<id>?alt=media`, by Drive file id. */
      media?: Record<string, MockMedia>;
      /** Whether the sign-in already granted saving to Drive (backup, share). */
      writeAccess?: boolean;
    };

export type MockDriveRecorder = {
  /** Every Drive API request the app made, as `METHOD path`. */
  apiRequests: string[];
  /** The `q` of every Drive file listing the app made (browse and search). */
  listQueries: string[];
  /**
   * Drive ids Drive answers 404 for. A scenario can remove an id to simulate the
   * owner sharing the file, or add one to take access away.
   */
  inaccessible: Set<string>;
  /** Every sign-in page address the app opened. */
  signInRequests: string[];
  /** The Drive files as they are now: what the app created, uploaded or changed. */
  store: MockDriveStore;
};

/** The localStorage entries that put the app in the account's session state. */
export const buildMockDriveStorageEntries = (
  account: MockDriveAccount,
  now: Date = new Date(),
): Record<string, string> => {
  if (account.state === 'signed-out') {
    return {};
  }

  if (account.state === 'expired') {
    return {
      [DRIVE_AUTH_SESSION_KEY]: JSON.stringify({
        expiresAt: new Date(now.getTime() - 1).toISOString(),
        status: 'expired',
      }),
    };
  }

  return {
    [DRIVE_AUTH_SESSION_KEY]: JSON.stringify({
      accessToken: MOCK_ACCESS_TOKEN,
      expiresAt: new Date(now.getTime() + AUTHORIZED_FOR_MS).toISOString(),
      scope: account.writeAccess ? `${READ_SCOPE} ${WRITE_SCOPE}` : READ_SCOPE,
    }),
  };
};

/**
 * Where the stub sign-in sends the browser back: the app's own redirect address
 * with an access token in the fragment (the implicit flow the app asked for),
 * echoing the request's `state`. This is a sign-in that was just completed.
 */
const buildSignInRedirect = (signInUrl: string): string => {
  const request = new URL(signInUrl);
  const redirectUri = request.searchParams.get('redirect_uri') ?? '';
  const result = new URLSearchParams({
    access_token: MOCK_ACCESS_TOKEN,
    expires_in: String(SIGN_IN_TOKEN_SECONDS),
    scope: request.searchParams.get('scope') ?? READ_SCOPE,
    state: request.searchParams.get('state') ?? '',
    token_type: 'Bearer',
  });

  return `${redirectUri}#${result.toString()}`;
};

const json = (route: Route, body: unknown, status: number = OK_STATUS) =>
  route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    headers: CORS_HEADERS,
    status,
  });

const notFound = (route: Route) =>
  json(route, { error: { code: NOT_FOUND_STATUS } }, NOT_FOUND_STATUS);

/** Answers the Drive API and the sign-in page locally, and records what the app asked. */
export const installMockDriveRoutes = async (
  context: BrowserContext,
  account: MockDriveAccount,
): Promise<MockDriveRecorder> => {
  const store = new MockDriveStore();
  const inaccessible = new Set(
    account.state === 'authorized' ? (account.inaccessibleFileIds ?? []) : [],
  );
  const recorder: MockDriveRecorder = {
    apiRequests: [],
    inaccessible,
    listQueries: [],
    signInRequests: [],
    store,
  };
  const media = account.state === 'authorized' ? (account.media ?? {}) : {};

  if (account.state === 'authorized') {
    for (const file of account.files ?? []) {
      store.seed(file as Record<string, unknown>);
    }
  }

  // Resumable uploads: the content received so far, by file id.
  const resumable = new Map<string, Buffer[]>();

  const preflight = (route: Route) =>
    route.fulfill({ headers: CORS_HEADERS, status: NO_CONTENT_STATUS });

  await context.route(DRIVE_UPLOAD_PATTERN, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    // The Authorization header makes the browser preflight every request.
    if (request.method() === 'OPTIONS') {
      return preflight(route);
    }

    recorder.apiRequests.push(`${request.method()} ${url.pathname}`);

    const body = request.postDataBuffer() ?? Buffer.alloc(0);

    // Multipart: metadata and content in one request.
    if (url.searchParams.get('uploadType') === 'multipart') {
      const { content, metadata } = parseMultipartRelated(
        body,
        request.headers()['content-type'] ?? '',
      );

      return json(route, store.toJson(store.create(metadata, content)));
    }

    // Resumable, step 1: the metadata, answered with where to send the bytes.
    if (
      url.searchParams.get('uploadType') === 'resumable' &&
      !url.searchParams.has('upload_id')
    ) {
      const record = store.create(JSON.parse(body.toString('utf8') || '{}'));

      resumable.set(record.id, []);

      return route.fulfill({
        headers: {
          ...CORS_HEADERS,
          location: `${DRIVE_UPLOAD_ADDRESS}?uploadType=resumable&upload_id=${record.id}`,
        },
        status: OK_STATUS,
      });
    }

    // Resumable, step 2: the bytes, whole or in ranges.
    const record = store.get(url.searchParams.get('upload_id') ?? '');
    const chunks = record ? resumable.get(record.id) : undefined;

    if (!record || !chunks) {
      return notFound(route);
    }

    chunks.push(body);

    const range = CONTENT_RANGE_PATTERN.exec(
      request.headers()['content-range'] ?? '',
    );
    const total = range?.[3] && range[3] !== '*' ? Number(range[3]) : undefined;
    const received = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

    if (total !== undefined && received < total) {
      return route.fulfill({
        headers: { ...CORS_HEADERS, range: `bytes=0-${received - 1}` },
        status: RESUME_INCOMPLETE_STATUS,
      });
    }

    record.content = Buffer.concat(chunks);
    resumable.delete(record.id);

    return json(route, store.toJson(record));
  });

  await context.route(DRIVE_API_PATTERN, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'OPTIONS') {
      return preflight(route);
    }

    recorder.apiRequests.push(`${request.method()} ${url.pathname}`);

    if (url.pathname.endsWith('/drive/v3/about')) {
      return json(route, { user: MOCK_DRIVE_USER });
    }

    const fileId = DRIVE_FILE_PATH_PATTERN.exec(url.pathname)?.[1];
    const isMissing = fileId !== undefined && inaccessible.has(fileId);

    if (isMissing) {
      return notFound(route);
    }

    // files.list
    if (fileId === undefined && request.method() === 'GET') {
      const query = url.searchParams.get('q') ?? '';

      recorder.listQueries.push(query);

      return json(route, {
        files: store.list(query).map((record) => store.toJson(record)),
      });
    }

    // files.create (a folder, or a file without content)
    if (fileId === undefined && request.method() === 'POST') {
      const meta = JSON.parse(request.postData() || '{}');

      return json(route, store.toJson(store.create(meta)));
    }

    const record = store.get(fileId ?? '');

    if (request.method() === 'DELETE') {
      store.delete(fileId ?? '');

      return route.fulfill({
        headers: CORS_HEADERS,
        status: NO_CONTENT_STATUS,
      });
    }

    if (request.method() === 'PATCH') {
      const changes = JSON.parse(request.postData() || '{}');
      const updated = store.update(fileId ?? '', {
        ...changes,
        addParents: url.searchParams.get('addParents') ?? undefined,
        removeParents: url.searchParams.get('removeParents') ?? undefined,
      });

      return updated ? json(route, store.toJson(updated)) : notFound(route);
    }

    // files.get: the content, or the file's description.
    if (url.searchParams.get('alt') === 'media') {
      const content = record?.content
        ? { body: record.content, contentType: record.mimeType }
        : media[fileId ?? ''];

      return content ? fulfillMedia(route, content) : notFound(route);
    }

    return json(route, record ? store.toJson(record) : { id: fileId });
  });

  const completesSignIn =
    account.state !== 'authorized' && account.completeSignIn;

  await context.route(SIGN_IN_PATTERN, (route) => {
    recorder.signInRequests.push(route.request().url());

    if (completesSignIn) {
      // A page that sends the popup on, not a 302: Playwright's WebKit cannot
      // fulfil a request with a redirect status. The popup ends up at the same
      // address either way.
      const target = buildSignInRedirect(route.request().url());

      return route.fulfill({
        body: `<title>Mock Google sign-in</title><script>location.replace(${JSON.stringify(target)})</script>`,
        contentType: 'text/html',
      });
    }

    return route.fulfill({
      body: '<title>Mock Google sign-in</title><p>Mock Google sign-in</p>',
      contentType: 'text/html',
    });
  });

  return recorder;
};
