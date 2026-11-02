// The app's TypeScript config carries no DOM library, so the slice of the
// browser API used here is described structurally (as in `peak-extractor.web`).
type AnchorLike = {
  click: () => void;
  download: string;
  href: string;
  remove: () => void;
  style: { display: string };
};

type BrowserScope = {
  URL?: {
    createObjectURL: (blob: Blob) => string;
    revokeObjectURL: (url: string) => void;
  };
  document?: {
    body: { appendChild: (node: AnchorLike) => unknown };
    createElement: (tag: 'a') => AnchorLike;
  };
};

// The browser starts the download after the click returns; the address must
// outlive that.
const REVOKE_DELAY_MS = 10_000;

/** Saves a file through the browser's download, with no permission and no network. */
export const saveRecordingFile = async (
  fileName: string,
  blob: Blob,
): Promise<void> => {
  const { URL: urls, document: page } = globalThis as unknown as BrowserScope;

  if (!urls || !page) {
    throw new Error('This browser cannot save files.');
  }

  const url = urls.createObjectURL(blob);
  const anchor = page.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  page.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => urls.revokeObjectURL(url), REVOKE_DELAY_MS);
};
