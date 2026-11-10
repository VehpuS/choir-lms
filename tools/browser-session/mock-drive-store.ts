import {
  matchesDriveQuery,
  type DriveQueryFile,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-drive/drive-query';

// The mock Drive's files: an in-memory store the routes read and write, so a
// backup the app uploads can be listed and downloaded again by the same
// session, as in real Drive. Seeded from the files a scenario gives.
export const MOCK_DRIVE_USER = {
  displayName: 'Mock Choir Member',
  emailAddress: 'member@example.test',
};
const ROOT_FOLDER_ID = 'root';
const FILE_ID_PREFIX = 'mock-file-';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const MULTIPART_LINE_BREAK = '\r\n';
const HEADER_END = '\r\n\r\n';

type Owner = { displayName?: string; emailAddress: string };

export type MockDriveRecord = DriveQueryFile & {
  content?: Buffer;
  createdTime: string;
  id: string;
  /** Fields a scenario gave that the store does not model (size, extension, …). */
  extra: Record<string, unknown>;
  modifiedTime: string;
  owners: Owner[];
};

type RawFile = Record<string, unknown> & { id?: string };

const asStrings = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((v) => typeof v === 'string') : undefined;

export class MockDriveStore {
  private readonly records = new Map<string, MockDriveRecord>();
  private nextId = 1;

  constructor(
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  /** Adds a file object as a scenario writes it (like a Drive API file). */
  seed(raw: RawFile): MockDriveRecord {
    const {
      appProperties,
      id,
      mimeType,
      name,
      owners,
      parents,
      sharedWithMe,
      trashed,
      ...extra
    } = raw as RawFile & {
      appProperties?: Record<string, string>;
      mimeType?: string;
      name?: string;
      owners?: Owner[];
      parents?: string[];
      sharedWithMe?: boolean;
      trashed?: boolean;
    };
    const created = this.now();

    return this.put({
      appProperties,
      createdTime: created,
      extra,
      id: id ?? `${FILE_ID_PREFIX}${this.nextId++}`,
      mimeType: mimeType ?? 'application/octet-stream',
      modifiedTime:
        typeof extra.modifiedTime === 'string' ? extra.modifiedTime : created,
      name: name ?? 'Untitled',
      ownerEmails: (owners ?? [MOCK_DRIVE_USER]).map(
        (owner) => owner.emailAddress,
      ),
      owners: owners ?? [MOCK_DRIVE_USER],
      parents: asStrings(parents) ?? [ROOT_FOLDER_ID],
      sharedWithMe,
      trashed,
    });
  }

  /** What Drive does for `files.create`: a new file or folder owned by the user. */
  create(
    meta: {
      appProperties?: Record<string, string>;
      mimeType?: string;
      name?: string;
      parents?: string[];
    },
    content?: Buffer,
  ): MockDriveRecord {
    const record = this.seed({ ...meta, owners: [MOCK_DRIVE_USER] });

    if (content) {
      record.content = content;
    }

    return record;
  }

  private put(record: MockDriveRecord): MockDriveRecord {
    this.records.set(record.id, record);

    return record;
  }

  get(id: string): MockDriveRecord | undefined {
    return this.records.get(id);
  }

  /** Files that match a `files.list` query, for the user `me`. */
  list(
    query: string,
    me: string = MOCK_DRIVE_USER.emailAddress,
  ): MockDriveRecord[] {
    return [...this.records.values()].filter((record) =>
      matchesDriveQuery(query, record, me),
    );
  }

  update(
    id: string,
    changes: {
      addParents?: string;
      appProperties?: Record<string, string>;
      name?: string;
      removeParents?: string;
      trashed?: boolean;
    },
  ): MockDriveRecord | undefined {
    const record = this.records.get(id);

    if (!record) {
      return undefined;
    }

    if (changes.name !== undefined) record.name = changes.name;
    if (changes.trashed !== undefined) record.trashed = changes.trashed;
    if (changes.appProperties) {
      record.appProperties = {
        ...record.appProperties,
        ...changes.appProperties,
      };
    }

    if (changes.removeParents) {
      const removed = new Set(changes.removeParents.split(','));

      record.parents = record.parents.filter((parent) => !removed.has(parent));
    }

    if (changes.addParents) {
      record.parents = [...record.parents, ...changes.addParents.split(',')];
    }

    record.modifiedTime = this.now();

    return record;
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }

  /** The file as the Drive API returns it. */
  toJson(record: MockDriveRecord): Record<string, unknown> {
    return {
      ...record.extra,
      ...(record.appProperties ? { appProperties: record.appProperties } : {}),
      createdTime: record.createdTime,
      id: record.id,
      mimeType: record.mimeType,
      modifiedTime: record.modifiedTime,
      name: record.name,
      owners: record.owners,
      parents: record.parents,
      ...(record.content ? { size: String(record.content.length) } : {}),
      ...(record.trashed ? { trashed: true } : {}),
    };
  }
}

export const isFolder = (record: MockDriveRecord) =>
  record.mimeType === FOLDER_MIME_TYPE;

/**
 * Splits a `multipart/related` upload into its JSON metadata and the file
 * bytes (the two parts the app sends).
 */
export const parseMultipartRelated = (
  body: Buffer,
  contentType: string,
): { content: Buffer; metadata: Record<string, unknown> } => {
  const boundary = /boundary=("?)([^";]+)\1/.exec(contentType)?.[2];

  if (!boundary) {
    throw new Error('Mock Drive: a multipart upload without a boundary');
  }

  const delimiter = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];
  let cursor = body.indexOf(delimiter);

  while (cursor >= 0) {
    const next = body.indexOf(delimiter, cursor + delimiter.length);

    if (next < 0) break;

    parts.push(body.subarray(cursor + delimiter.length, next));
    cursor = next;
  }

  const bodyOf = (part: Buffer) => {
    const start = part.indexOf(HEADER_END) + HEADER_END.length;
    const end = part.length - Buffer.byteLength(MULTIPART_LINE_BREAK);

    return part.subarray(start, end);
  };

  if (parts.length < 2) {
    throw new Error(
      'Mock Drive: a multipart upload needs metadata and content',
    );
  }

  return {
    content: bodyOf(parts[1]),
    metadata: JSON.parse(bodyOf(parts[0]).toString('utf8')) as Record<
      string,
      unknown
    >,
  };
};
