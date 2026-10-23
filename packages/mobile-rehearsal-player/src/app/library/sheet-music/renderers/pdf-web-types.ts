// Structural descriptions of the DOM and pdf.js slices the web renderer uses.
// The app's TypeScript config carries no DOM library, so the slices of the DOM
// and of pdf.js used here are described structurally.
export type DomElement = {
  appendChild(child: unknown): unknown;
  innerHTML: string;
  style: { cssText: string };
};
export type DomCanvas = DomElement & {
  getContext(kind: '2d'): unknown;
  height: number;
  width: number;
};
export type HostElement = DomElement & {
  clientHeight: number;
  clientWidth: number;
  scrollLeft: number;
  scrollTop: number;
  ownerDocument: { createElement(tag: 'canvas'): DomCanvas } & {
    createElement(tag: 'div'): DomElement;
  } & {
    defaultView: {
      getComputedStyle(element: unknown): { overflowY: string };
    } | null;
  };
  parentElement: HostElement | null;
};
export type ObserverEntry = { isIntersecting: boolean; target: unknown };
export type PageObserver = {
  disconnect(): void;
  observe(target: unknown): void;
};
export type PageObserverConstructor = new (
  callback: (entries: ObserverEntry[]) => void,
  options: { root: unknown; rootMargin: string },
) => PageObserver;

export type PdfViewport = { height: number; width: number };
export type PdfRenderTask = { cancel(): void; promise: Promise<unknown> };
export type PdfPage = {
  getViewport(options: { scale: number }): PdfViewport;
  render(options: {
    canvasContext: unknown;
    viewport: PdfViewport;
  }): PdfRenderTask;
};
export type PdfDocument = {
  destroy(): Promise<unknown>;
  getPage(pageNumber: number): Promise<PdfPage>;
  numPages: number;
};
export type PdfJs = {
  getDocument(source: { data: Uint8Array }): { promise: Promise<PdfDocument> };
};
