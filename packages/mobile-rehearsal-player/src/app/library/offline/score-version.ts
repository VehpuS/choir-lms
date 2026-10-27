const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const VERSION_LOOKUP_TIMEOUT_MS = 3000;

/**
 * A score's Drive `modifiedTime`, the version a kept copy is stored at. Null
 * when it cannot be read (offline, slow, or no access): the caller then keeps
 * or uses whatever it has rather than failing.
 */
export const fetchScoreVersion = async (
  driveFileId: string,
  accessToken: string,
): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, VERSION_LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${DRIVE_FILES_URL}/${encodeURIComponent(driveFileId)}?fields=modifiedTime&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    const { modifiedTime } = (await response.json()) as {
      modifiedTime?: unknown;
    };

    return typeof modifiedTime === 'string' && modifiedTime.length > 0
      ? modifiedTime
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
