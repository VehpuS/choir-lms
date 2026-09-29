export type OpenDriveFileInGoogleDriveResult =
  | { status: 'opened' }
  | { status: 'no-link' }
  | { status: 'unsupported-link' }
  | { status: 'open-failed' };

/**
 * Opens a Drive file's own Google Drive page (its `webViewLink`) through an
 * injected Linking-shaped adapter. Unlike a saved track's "Open in Google
 * Drive", nothing is resolved first: an Add row is the file as Drive just
 * listed it, so its link is current.
 */
export const openDriveFileInGoogleDrive = async (options: {
  canOpenUrl: (url: string) => Promise<boolean>;
  openUrl: (url: string) => Promise<unknown>;
  url: string | undefined;
}): Promise<OpenDriveFileInGoogleDriveResult> => {
  if (!options.url) {
    return { status: 'no-link' };
  }

  if (!(await options.canOpenUrl(options.url))) {
    return { status: 'unsupported-link' };
  }

  try {
    await options.openUrl(options.url);
    return { status: 'opened' };
  } catch {
    return { status: 'open-failed' };
  }
};
