/** Lets the app create files, and read or change only files it created. */
export const DRIVE_WRITE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// The full Drive scope also allows creating files, so a session that has it
// can save without asking again.
const FULL_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const SCOPE_SEPARATOR_PATTERN = /\s+/;

/** True when a granted scope string (space separated) lets the app create Drive files. */
export const hasDriveWriteScope = (scope: string | undefined): boolean => {
  if (!scope) {
    return false;
  }

  return scope
    .split(SCOPE_SEPARATOR_PATTERN)
    .some(
      (granted) =>
        granted === DRIVE_WRITE_SCOPE || granted === FULL_DRIVE_SCOPE,
    );
};
