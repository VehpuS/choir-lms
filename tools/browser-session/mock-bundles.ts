import { buildLibraryBundle } from '@org/audio-library-runtime';

import {
  buildMockLibraryTree,
  type MockLibrary,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import type { MockMedia } from './mock-media';

// Library bundles for the backup, restore, import and share scenarios. They
// are built with the runtime's own `buildLibraryBundle` from a mock library,
// so they follow the code's bundle format (and its upgrade steps) instead of a
// frozen file, and put in the mock Drive the way a backup or a shared bundle is.
const BUNDLE_MIME_TYPE = 'application/json';
const DEFAULT_CREATED_AT = '2026-11-01T10:00:00.000Z';

export type MockBundleOptions = {
  /** Who wrote it; shown as "Imported from <name>". */
  author?: { email?: string; name: string };
  createdAt?: string;
  /** The bundle's file name in Drive. */
  fileName: string;
  /** Drive folder it sits in (Backups, or wherever a share was put). */
  folderId?: string;
  library: MockLibrary;
  /** True for a bundle somebody else shared with you. */
  sharedWithMe?: boolean;
};

export type MockBundleFile = {
  /** The Drive API object to put in the account's `files`. */
  file: Record<string, unknown>;
  id: string;
  /** Its bytes, for the account's `media`. */
  media: MockMedia;
};

let nextBundleNumber = 1;

export const buildMockBundleFile = (
  options: MockBundleOptions,
): MockBundleFile => {
  const { bundle } = buildLibraryBundle({
    author: options.author ?? { name: 'Dana' },
    createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
    input: {
      composites: options.library.composites ?? [],
      loops: options.library.loops ?? [],
      playlists: options.library.playlists,
      sources: options.library.sources,
      tree: buildMockLibraryTree(options.library),
    },
    scope: { kind: 'library' },
  });
  const id = `mock-bundle-${nextBundleNumber++}`;
  const counts = [
    bundle.sources.length,
    bundle.loops.length,
    bundle.playlists.length,
  ].join(',');

  return {
    file: {
      appProperties: { choirlmsBundle: 'v1', choirlmsCounts: counts },
      id,
      mimeType: BUNDLE_MIME_TYPE,
      modifiedTime: options.createdAt ?? DEFAULT_CREATED_AT,
      name: options.fileName,
      ...(options.author?.email
        ? {
            owners: [
              {
                displayName: options.author.name,
                emailAddress: options.author.email,
              },
            ],
          }
        : {}),
      ...(options.folderId ? { parents: [options.folderId] } : {}),
      ...(options.sharedWithMe ? { sharedWithMe: true } : {}),
    },
    id,
    media: {
      body: Buffer.from(JSON.stringify(bundle), 'utf8'),
      contentType: BUNDLE_MIME_TYPE,
    },
  };
};
