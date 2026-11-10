// `pdfjs-dist` 4.x ships types only for its source entry, not for the prebuilt .mjs entry points, which are
// the ones that bundle under Metro (spike 9.2). The slice used is described
// structurally in `pdf-renderer.web.ts`.
declare module 'pdfjs-dist/build/pdf.mjs' {
  const pdfjs: unknown;
  export = pdfjs;
}

declare module 'pdfjs-dist/build/pdf.worker.mjs' {
  const worker: unknown;
  export = worker;
}
