import type { BrowserContext } from 'playwright';

import { fulfillMedia, type MockMedia } from './mock-media';

// A deliberately small stand-in for Google Drive, so the browser suite can run
// authorised and expired sessions without a real sign-in. Grow it when a test
// needs more: add a field to `MockDriveAccount` and one branch to the route.
//
// - Session: the app restores its sign-in from localStorage, so we seed it.
// - Drive API: `https://www.googleapis.com/drive/v3/**` is answered locally.
// - Sign-in: `https://accounts.google.com/**` serves a stub page, so pressing
//   Reconnect opens a window we can observe instead of leaving the machine.
const DRIVE_AUTH_SESSION_KEY = 'choirlms.google-drive.authorization';
const DRIVE_API_PATTERN = /^https:\/\/www\.googleapis\.com\/drive\/v3\//;
const SIGN_IN_PATTERN = /^https:\/\/accounts\.google\.com\//;
const DRIVE_FILE_PATH_PATTERN = /\/drive\/v3\/files\/([^/?]+)/;
const NAME_CONTAINS_PATTERN = /name contains '((?:[^'\\]|\\.)*)'/;
const ESCAPED_CHARACTER_PATTERN = /\\(.)/g;
const IN_PARENTS_PATTERN = /'([^']+)' in parents/;
const ROOT_FOLDER_ID = 'root';
const MOCK_ACCESS_TOKEN = 'mock-drive-access-token';
const AUTHORIZED_FOR_MS = 60 * 60 * 1000;
const NOT_FOUND_STATUS = 404;
const NO_CONTENT_STATUS = 204;
const OK_STATUS = 200;
const CORS_HEADERS = {
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-allow-origin': '*',
};

export type MockDriveAccount =
  /** Never signed in: the app has no stored session. */
  | { state: 'signed-out' }
  /** Was signed in; the token ran out, so the app offers Reconnect. */
  | { state: 'expired' }
  | {
      state: 'authorized';
      /** Drive ids Drive answers 404 for, as for a file never shared with the user. */
      inaccessibleFileIds?: string[];
      /** What a Drive file listing returns. */
      files?: unknown[];
      /** Bytes Drive serves for `files/<id>?alt=media`, by Drive file id. */
      media?: Record<string, MockMedia>;
    };

type MockDriveFile = { name?: string; parents?: string[] };

/**
 * What a Drive file listing returns for a query: only the parts the app uses,
 * the folder (`'<id>' in parents`; a file with no `parents` is in My Drive's
 * root) and the name (`name contains '<text>'`, case-insensitive). Anything
 * else in the query is ignored, so every file you give is a candidate.
 */
const filterListing = (files: unknown[], query: string): unknown[] => {
  const parent = IN_PARENTS_PATTERN.exec(query)?.[1];
  const text = NAME_CONTAINS_PATTERN.exec(query)?.[1]
    ?.replace(ESCAPED_CHARACTER_PATTERN, '$1')
    .toLowerCase();

  return (files as MockDriveFile[]).filter((file) => {
    // A name search looks in every folder; a browse looks in one.
    const inFolder =
      text !== undefined ||
      parent === undefined ||
      (file.parents ?? [ROOT_FOLDER_ID]).includes(parent);

    return (
      inFolder &&
      (text === undefined || (file.name ?? '').toLowerCase().includes(text))
    );
  });
};

export type MockDriveRecorder = {
  /** Every Drive API request the app made, as `METHOD path`. */
  apiRequests: string[];
  /** The `q` of every Drive file listing the app made (browse and search). */
  listQueries: string[];
  /** Every sign-in page address the app opened. */
  signInRequests: string[];
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
    }),
  };
};

/** Answers the Drive API and the sign-in page locally, and records what the app asked. */
export const installMockDriveRoutes = async (
  context: BrowserContext,
  account: MockDriveAccount,
): Promise<MockDriveRecorder> => {
  const recorder: MockDriveRecorder = {
    apiRequests: [],
    listQueries: [],
    signInRequests: [],
  };
  const inaccessible = new Set(
    account.state === 'authorized' ? (account.inaccessibleFileIds ?? []) : [],
  );
  const files = account.state === 'authorized' ? (account.files ?? []) : [];
  const media = account.state === 'authorized' ? (account.media ?? {}) : {};

  await context.route(DRIVE_API_PATTERN, (route) => {
    const request = route.request();
    const url = new URL(request.url());

    // The Authorization header makes the browser preflight every request.
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        headers: CORS_HEADERS,
        status: NO_CONTENT_STATUS,
      });
    }

    recorder.apiRequests.push(`${request.method()} ${url.pathname}`);

    const fileId = DRIVE_FILE_PATH_PATTERN.exec(url.pathname)?.[1];

    if (fileId === undefined && url.searchParams.has('q')) {
      recorder.listQueries.push(url.searchParams.get('q') ?? '');
    }

    const isMissing = fileId !== undefined && inaccessible.has(fileId);

    if (
      fileId !== undefined &&
      !isMissing &&
      url.searchParams.get('alt') === 'media'
    ) {
      const file = media[fileId];

      return file
        ? fulfillMedia(route, file)
        : route.fulfill({
            body: JSON.stringify({ error: { code: 404 } }),
            contentType: 'application/json',
            headers: CORS_HEADERS,
            status: NOT_FOUND_STATUS,
          });
    }

    const body =
      fileId === undefined
        ? { files: filterListing(files, url.searchParams.get('q') ?? '') }
        : { id: fileId };

    return route.fulfill({
      body: JSON.stringify(isMissing ? { error: { code: 404 } } : body),
      contentType: 'application/json',
      headers: CORS_HEADERS,
      status: isMissing ? NOT_FOUND_STATUS : OK_STATUS,
    });
  });

  await context.route(SIGN_IN_PATTERN, (route) => {
    recorder.signInRequests.push(route.request().url());

    return route.fulfill({
      body: '<title>Mock Google sign-in</title><p>Mock Google sign-in</p>',
      contentType: 'text/html',
    });
  });

  return recorder;
};
