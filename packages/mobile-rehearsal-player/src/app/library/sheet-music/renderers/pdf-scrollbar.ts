import type { PdfLayout } from '@org/audio-library-models';

import type { HostElement } from './pdf-web-types';

const HIDDEN_ATTRIBUTE = 'data-pdf-scrollbar';
const HIDDEN_VALUE = 'hidden';
const STYLE_ELEMENT_ID = 'pdf-scrollbar-style';
// `scrollbar-width` covers current browsers; older Safari needs the pseudo-element.
const HIDE_SCROLLBAR_CSS = `[${HIDDEN_ATTRIBUTE}="${HIDDEN_VALUE}"]{scrollbar-width:none;}[${HIDDEN_ATTRIBUTE}="${HIDDEN_VALUE}"]::-webkit-scrollbar{display:none;}`;

/**
 * Whether the sideways scrollbar is hidden: in `pages`, swiping and the page
 * controls move the view and the page indicator shows the position. `strip`
 * keeps it because the reader scrolls freely there.
 */
export const isPdfScrollbarHidden = (layout: PdfLayout): boolean => {
  return layout === 'pages';
};

const ensureScrollbarStyle = (host: HostElement): void => {
  const doc = host.ownerDocument;

  if (doc.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }

  const style = doc.createElement('style');

  style.id = STYLE_ELEMENT_ID;
  style.textContent = HIDE_SCROLLBAR_CSS;
  doc.head.appendChild(style);
};

/** Shows or hides the host's scrollbar for the layout; clears it on `undefined`. */
export const applyPdfScrollbar = (
  host: HostElement,
  layout: PdfLayout | undefined,
): void => {
  if (layout !== undefined && isPdfScrollbarHidden(layout)) {
    ensureScrollbarStyle(host);
    host.setAttribute(HIDDEN_ATTRIBUTE, HIDDEN_VALUE);
  } else {
    host.removeAttribute(HIDDEN_ATTRIBUTE);
  }
};
