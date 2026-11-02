/** Native cannot export yet (see `recordingCapabilities`); the web file saves through the browser. */
export const saveRecordingFile: (
  fileName: string,
  blob: Blob,
) => Promise<void> = async () => {
  throw new Error('Saving a file is only available on the web build.');
};
