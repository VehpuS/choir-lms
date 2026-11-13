/**
 * The Content-Security-Policy of the exported web app, delivered as a meta tag
 * because GitHub Pages sends no headers (so `frame-ancestors`, which only works
 * as a header, is out of reach). It is added to the exported `index.html` by
 * `tools/web-csp/inject-csp.ts`, not written in `public/index.html`: the Expo
 * dev server serves that file too, and loads its lazily split code by fetching
 * it and calling `eval`, which this policy forbids.
 *
 * Script comes only from the app's own origin, with no inline script and no
 * eval, plus `blob:` because the audio worklets (pitch shifting, the pitch and
 * recording microphone feeds, the composite engine) are built from source
 * strings and loaded from blob URLs. `style-src` needs `'unsafe-inline'`
 * because react-native-web writes inline style attributes. `connect-src` and
 * `media-src` allow any https host because people add audio and score links
 * from anywhere, so the policy limits injected script but not what a script
 * that gets in can send out.
 */
export const WEB_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' blob: 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob: data: https:",
  "connect-src 'self' blob: data: https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const POLICY_TAG_PATTERN = /http-equiv\s*=\s*["']Content-Security-Policy["']/i;
const CHARSET_TAG_PATTERN = /<meta\s+charset[^>]*>/i;
const HEAD_OPEN_PATTERN = /<head[^>]*>/i;

/**
 * Puts the policy in a page's head, right after the charset tag (a policy only
 * covers what loads after it). Refuses a page that already has one, so a
 * second run or a hand-written tag is noticed instead of doubled.
 */
export const addContentSecurityPolicy = (
  html: string,
  policy: string = WEB_CONTENT_SECURITY_POLICY,
): string => {
  if (POLICY_TAG_PATTERN.test(html)) {
    throw new Error('The page already has a Content-Security-Policy tag.');
  }

  const tag = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;
  const anchor = CHARSET_TAG_PATTERN.exec(html) ?? HEAD_OPEN_PATTERN.exec(html);

  if (!anchor) {
    throw new Error('The page has no <head> to put the policy in.');
  }

  const end = anchor.index + anchor[0].length;

  return `${html.slice(0, end)}\n    ${tag}${html.slice(end)}`;
};
