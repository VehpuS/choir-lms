import type { PdfJs } from './pdf-web-types';

const PASSWORD_ERROR_NAME = 'PasswordException';

let pdfjsPromise: Promise<PdfJs> | undefined;

// pdf.js and its worker are large, so they load on demand. The worker runs on
// the main thread (pdf.js's "fake worker") because the real one needs a static
// file served at a known path; spike 9.2 measured this as fast enough, and a
// real worker is the fallback if long PDFs make the page jank.
export const loadPdfjs = (): Promise<PdfJs> => {
  pdfjsPromise ??= (async () => {
    const [pdfModule, workerModule] = await Promise.all([
      import('pdfjs-dist/build/pdf'),
      import('pdfjs-dist/build/pdf.worker'),
    ]);
    const worker = workerModule as {
      default?: unknown;
      WorkerMessageHandler?: unknown;
    };
    const pdf = pdfModule as { default?: PdfJs } & Partial<PdfJs>;

    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker =
      worker.WorkerMessageHandler ? worker : (worker.default ?? worker);

    return (pdf.getDocument ? pdf : pdf.default) as PdfJs;
  })().catch((error: unknown) => {
    // A failed load (offline chunk fetch) must not be cached for the session.
    pdfjsPromise = undefined;
    throw error;
  });

  return pdfjsPromise;
};

export const isPasswordError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === PASSWORD_ERROR_NAME
  );
};
