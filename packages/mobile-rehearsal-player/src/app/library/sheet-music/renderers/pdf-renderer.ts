import type { PdfRenderer } from './sheet-music-renderer';

/** The DOM element the web renderer draws into; opaque off the web. */
export type PdfContainer = unknown;

/**
 * Native has no PDF renderer in this change; the web file supplies the real
 * one. Until native rendering lands (native-playback-follow-ups 1.6), the
 * viewer reports `unsupported-platform` and offers to open the source outside
 * the app.
 */
export const createPdfRenderer = (): PdfRenderer<PdfContainer> => ({
  async render() {
    return { reason: 'unsupported-platform', status: 'failed' };
  },
});
