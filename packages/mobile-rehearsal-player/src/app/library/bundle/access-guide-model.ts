import type { DriveAudioSource } from '@org/audio-library-models';

/**
 * The guide for files an import could not open (library-share-import spec).
 * Drive reports a deleted file and a never-shared file the same way, so the
 * copy never says which, and nothing here claims a cause or asks Drive for access.
 */

const DRIVE_FILE_URL = 'https://drive.google.com/file/d/';
const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/';
const UNKNOWN_OWNER_NAME = 'The owner';
const MIN_FILES_FOR_FOLDER_HINT = 2;

export const ACCESS_GUIDE_COPY = {
  explanation: 'Can’t open these yet. Ask the owner to share them.',
  openInDrive: 'Open in Drive',
  emailOwner: 'Email owner',
  copyList: 'Copy list',
  checkAgain: 'Check again',
} as const;

export const getDriveFileOpenUrl = (driveFileId: string) =>
  `${DRIVE_FILE_URL}${encodeURIComponent(driveFileId)}/view`;

export type AccessGuideFile = {
  sourceId: string;
  driveFileId: string;
  name: string;
  url: string;
};

export type AccessGuideFolderHint = {
  name: string;
  url: string;
  /** How many of this owner's files are in it. */
  fileCount: number;
};

export type AccessGuideGroup = {
  key: string;
  ownerName: string;
  ownerEmail?: string;
  /** The owner was not recorded, so the bundle's author stands in. */
  isAuthorFallback: boolean;
  files: AccessGuideFile[];
  folderHint?: AccessGuideFolderHint;
};

export const isNeedsAccessSource = (source: DriveAudioSource) =>
  source.availability.status === 'unavailable' &&
  source.availability.reason === 'needs-access';

const resolveContact = (source: DriveAudioSource) => {
  if (source.owner?.name || source.owner?.email) {
    return {
      name: source.owner.name ?? source.owner.email ?? UNKNOWN_OWNER_NAME,
      email: source.owner.email,
      isAuthorFallback: false,
    };
  }

  return {
    name: source.importedFrom?.author ?? UNKNOWN_OWNER_NAME,
    email: source.importedFrom?.authorEmail,
    isAuthorFallback: source.importedFrom !== undefined,
  };
};

/** The folder most of a group's files came from, when at least two did. */
const resolveFolderHint = (
  sources: readonly DriveAudioSource[],
): AccessGuideFolderHint | undefined => {
  const byFolder = new Map<string, { name: string; count: number }>();

  for (const { sourceLocation } of sources) {
    if (!sourceLocation) {
      continue;
    }

    const entry = byFolder.get(sourceLocation.parentFolderId) ?? {
      name: sourceLocation.parentFolderName,
      count: 0,
    };

    byFolder.set(sourceLocation.parentFolderId, {
      ...entry,
      count: entry.count + 1,
    });
  }

  const [best] = [...byFolder].sort((a, b) => b[1].count - a[1].count);

  return best && best[1].count >= MIN_FILES_FOR_FOLDER_HINT
    ? {
        name: best[1].name,
        url: `${DRIVE_FOLDER_URL}${encodeURIComponent(best[0])}`,
        fileCount: best[1].count,
      }
    : undefined;
};

/** One group per owner, files in name order, biggest group first. */
export const groupNeedsAccessSources = (
  sources: readonly DriveAudioSource[],
): AccessGuideGroup[] => {
  const needing = sources.filter(isNeedsAccessSource);
  const groups = new Map<string, DriveAudioSource[]>();
  const contacts = new Map<string, ReturnType<typeof resolveContact>>();

  for (const source of needing) {
    const contact = resolveContact(source);
    const key = (contact.email ?? contact.name).toLowerCase();

    groups.set(key, [...(groups.get(key) ?? []), source]);
    contacts.set(key, contacts.get(key) ?? contact);
  }

  return [...groups]
    .map(([key, members]): AccessGuideGroup => {
      const contact = contacts.get(key) as ReturnType<typeof resolveContact>;
      const folderHint = resolveFolderHint(members);

      return {
        key,
        ownerName: contact.name,
        ...(contact.email ? { ownerEmail: contact.email } : {}),
        isAuthorFallback: contact.isAuthorFallback,
        files: members
          .map((source) => ({
            sourceId: source.id,
            driveFileId: source.driveFileId,
            name: source.name,
            url: getDriveFileOpenUrl(source.driveFileId),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        ...(folderHint ? { folderHint } : {}),
      };
    })
    .sort((a, b) => b.files.length - a.files.length);
};

const fileLines = (files: readonly AccessGuideFile[]) =>
  files.map((file) => `${file.name}\n${file.url}`).join('\n\n');

/** A message to the owner listing the files; absent when no email is known. */
export const buildOwnerMailto = (
  group: AccessGuideGroup,
  senderName?: string,
): string | null => {
  if (!group.ownerEmail) {
    return null;
  }

  const body = [
    `Hi ${group.ownerName},`,
    '',
    'I can’t open these files from the shared rehearsal library. Could you share them with me?',
    '',
    fileLines(group.files),
    ...(senderName ? ['', `Thanks, ${senderName}`] : []),
  ].join('\n');

  return `mailto:${encodeURIComponent(group.ownerEmail)}?subject=${encodeURIComponent(
    'Please share rehearsal files',
  )}&body=${encodeURIComponent(body)}`;
};

/** The names and links of every group as plain text for any chat app. */
export const buildCopyList = (groups: readonly AccessGuideGroup[]): string =>
  groups
    .map((group) => `${group.ownerName}\n\n${fileLines(group.files)}`)
    .join('\n\n---\n\n');

export const formatAccessGuideTitle = (fileCount: number) =>
  fileCount === 1 ? '1 file needs access' : `${fileCount} files need access`;

/** `These 2 are in “Soprano parts” — ask for the folder once.` */
export const formatFolderHint = (hint: AccessGuideFolderHint) =>
  `These ${hint.fileCount} are in “${hint.name}” — you can ask for the folder once.`;

export type AccessCheckOutcome = {
  /** Sources with the recovered ones marked available again; loops and links are untouched. */
  updatedSources: DriveAudioSource[];
  recoveredCount: number;
  stillNeedingCount: number;
};

/**
 * Applies a fresh probe: a file that can now be opened becomes available, the
 * rest stay as they are. Only a definite answer changes a source, so an
 * undecided probe (offline) never flips anything either way.
 */
export const applyAccessCheck = (
  sources: readonly DriveAudioSource[],
  access: ReadonlyMap<string, 'accessible' | 'needs-access' | 'unknown'>,
): AccessCheckOutcome => {
  const recovered = sources.filter(
    (source) =>
      isNeedsAccessSource(source) &&
      access.get(source.driveFileId) === 'accessible',
  );
  const recoveredIds = new Set(recovered.map((source) => source.id));

  return {
    updatedSources: recovered.map((source) => {
      const {
        message: _message,
        reason: _reason,
        ...rest
      } = source.availability;

      return { ...source, availability: { ...rest, status: 'available' } };
    }),
    recoveredCount: recoveredIds.size,
    stillNeedingCount: sources.filter(
      (source) => isNeedsAccessSource(source) && !recoveredIds.has(source.id),
    ).length,
  };
};
