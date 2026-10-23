import type { PdfDocument, PdfJs } from './pdf-web-types';

const PASSWORD_ERROR_NAME = 'PasswordException';

let pdfjsPromise: Promise<PdfJs> | undefined;

// pdf.js and its worker are large, so they load on demand. The worker runs on
// the main thread (pdf.js's "fake worker") because the real one needs a static
// file served at a known path; spike 9.2 measured this as fast enough, and a
// real worker is the fallback if long PDFs make the page jank.
const loadPdfjs = (): Promise<PdfJs> => {
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

/** Opens a document and measures every page at scale 1. */
export const openPdf = async (bytes: Uint8Array) => {
  const pdfjs = await loadPdfjs();

  // pdf.js may take ownership of the buffer, so it gets its own copy.
  const doc: PdfDocument = await pdfjs.getDocument({ data: bytes.slice() })
    .promise;
  const pages = await Promise.all(
    Array.from({ length: doc.numPages }, async (_, index) => {
      const page = await doc.getPage(index + 1);
      const size = page.getViewport({ scale: 1 });

      return { height: size.height, index, page, width: size.width };
    }),
  );

  return { doc, pages };
};
