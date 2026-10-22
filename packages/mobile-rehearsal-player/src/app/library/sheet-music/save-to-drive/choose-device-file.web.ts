import { DEVICE_FILE_ACCEPT } from './device-file-model';
import type { DeviceFile, DeviceFileChoice } from './device-file-chooser-types';

// The parts of the DOM used here; the app's TypeScript config has no DOM lib.
type BrowserFile = {
  arrayBuffer(): Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
};

export type FileInput = {
  accept: string;
  addEventListener(type: 'cancel' | 'change', listener: () => void): void;
  click(): void;
  files: ArrayLike<BrowserFile> | null;
  type: string;
};

const toDeviceFile = (file: BrowserFile): DeviceFile => ({
  mimeType: file.type,
  name: file.name,
  read: async () => new Uint8Array(await file.arrayBuffer()),
  size: file.size,
});

/** Resolves once the user picks a file or dismisses the chooser. */
export const chooseFileWithInput = (
  input: FileInput,
): Promise<DeviceFileChoice> => {
  return new Promise((resolve) => {
    input.type = 'file';
    input.accept = DEVICE_FILE_ACCEPT;
    input.addEventListener('change', () => {
      const file = input.files?.[0];

      resolve(
        file
          ? { file: toDeviceFile(file), status: 'chosen' }
          : { status: 'cancelled' },
      );
    });
    // Browsers report a dismissed chooser with `cancel`.
    input.addEventListener('cancel', () => resolve({ status: 'cancelled' }));
    input.click();
  });
};

/**
 * Opens the browser's file chooser. It must be called from a tap, or the
 * browser blocks it.
 */
export const chooseDeviceFile = (): Promise<DeviceFileChoice> => {
  const browserDocument = (
    globalThis as {
      document?: { createElement(tag: 'input'): FileInput };
    }
  ).document;

  return browserDocument
    ? chooseFileWithInput(browserDocument.createElement('input'))
    : Promise.resolve({ status: 'unsupported' });
};
