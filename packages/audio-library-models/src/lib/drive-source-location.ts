export type DriveSourceLocationRootKind = 'my-drive' | 'shared';

export type DriveSourceLocationPathSegment = {
  id: string;
  name: string;
};

export type DriveSourceLocation = {
  parentFolderId: string;
  parentFolderName: string;
  rootKind: DriveSourceLocationRootKind;
  path: DriveSourceLocationPathSegment[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isDriveSourceLocationPathSegment = (
  value: unknown,
): value is DriveSourceLocationPathSegment => {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  );
};

export const isDriveSourceLocation = (
  value: unknown,
): value is DriveSourceLocation => {
  return (
    isRecord(value) &&
    typeof value.parentFolderId === 'string' &&
    typeof value.parentFolderName === 'string' &&
    (value.rootKind === 'my-drive' || value.rootKind === 'shared') &&
    Array.isArray(value.path) &&
    value.path.every(isDriveSourceLocationPathSegment)
  );
};
