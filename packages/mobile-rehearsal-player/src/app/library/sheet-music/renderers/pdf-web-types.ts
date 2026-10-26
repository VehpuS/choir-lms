// Structural descriptions of the DOM and pdf.js slices the web renderer uses.
// The app's TypeScript config carries no DOM library, so the slices of the DOM
// and of pdf.js used here are described structurally.
export type DomElement = {
  appendChild(child: unknown): unknown;
  innerHTML: string;
  style: { cssText: string };
};
export type DomStyleElement = { id: string; textContent: string | null };
export type DomCanvas = DomElement & {
  getContext(kind: '2d'): unknown;
  height: number;
  width: number;
};
export type HostElement = Omit<DomElement, 'style'> & {
  // The host's own style is shared with the viewer, so only named properties
  // are set on it, never `cssText`.
  style: { scrollSnapType: string };
  clientHeight: number;
  clientWidth: number;
  /** Wider than `clientWidth` by a scrollbar or the gutter reserved for one. */
  offsetWidth: number;
  addEventListener(type: 'scroll' | 'scrollend', listener: () => void): void;
  removeAttribute(name: string): void;
  removeEventListener(type: 'scroll' | 'scrollend', listener: () => void): void;
  scrollLeft: number;
  scrollTop: number;
  scrollTo(options: { behavior: 'smooth'; left: number; top: number }): void;
  setAttribute(name: string, value: string): void;
  ownerDocument: { createElement(tag: 'canvas'): DomCanvas } & {
    createElement(tag: 'div'): DomElement;
    createElement(tag: 'style'): DomStyleElement;
  } & {
    getElementById(id: string): unknown;
    head: { appendChild(child: unknown): unknown };
    defaultView: {
      getComputedStyle(element: unknown): { overflowY: string };
      matchMedia?(query: string): { matches: boolean };
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
