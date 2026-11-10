import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { appTheme } from './theme';

// The web entry page cannot import the theme, so it repeats the background
// colour; this keeps the copy in step and pins the viewport settings the
// landscape layout relies on (issue #46).
const html = readFileSync(
  join(__dirname, '..', '..', '..', 'public', 'index.html'),
  'utf8',
);

describe('web entry html', () => {
  it('paints the app background on html and body', () => {
    const background = new RegExp(
      `background-color:\\s*${appTheme.colors.bg}\\s*;`,
      'i',
    );

    assert.match(html, background);
  });

  it('lets the page reach the screen edges', () => {
    assert.match(html, /viewport-fit=cover/);
  });

  it('follows the dynamic viewport height', () => {
    assert.match(html, /height:\s*100dvh/);
  });

  it('keeps the placeholders Expo fills in', () => {
    assert.match(html, /%LANG_ISO_CODE%/);
    assert.match(html, /%WEB_TITLE%/);
  });
});
