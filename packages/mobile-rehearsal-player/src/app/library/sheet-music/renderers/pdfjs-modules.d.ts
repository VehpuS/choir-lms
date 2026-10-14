// `pdfjs-dist` 3.x ships no types for its prebuilt entry points, which are
// the ones that bundle under Metro (spike 9.2). The slice used is described
// structurally in `pdf-renderer.web.ts`.
declare module 'pdfjs-dist/build/pdf' {
  const pdfjs: unknown;
  export = pdfjs;
}

declare module 'pdfjs-dist/build/pdf.worker' {
  const worker: unknown;
  export = worker;
}
