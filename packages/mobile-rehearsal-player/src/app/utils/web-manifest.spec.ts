import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { appTheme } from './theme';

// The manifest is static (Metro does not generate one), so this pins what an
// installed app depends on: a stable id, a scope that follows the base path the
// page is served from, standalone display, the app's colours and icons that
// exist on disk.
const publicDir = join(__dirname, '..', '..', '..', 'public');
const manifest = JSON.parse(
  readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8'),
) as {
  background_color: string;
  display: string;
  icons: { purpose?: string; sizes: string; src: string }[];
  id: string;
  scope: string;
  start_url: string;
  theme_color: string;
};
const html = readFileSync(join(publicDir, 'index.html'), 'utf8');

describe('web manifest', () => {
  it('is linked from the entry page, with the home-screen icon', () => {
    assert.match(html, /<link rel="manifest" href="manifest\.webmanifest"/);
    assert.match(html, /<link rel="apple-touch-icon" href="icons\/[^"]+\.png"/);
  });

  it('has an id and a start URL inside its scope, all relative to the base path', () => {
    for (const value of [manifest.id, manifest.start_url, manifest.scope]) {
      assert.ok(
        !value.startsWith('/'),
        `${value} is absolute, so it ignores the base path`,
      );
    }
  });

  it('opens standalone in the app colours', () => {
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.background_color, appTheme.colors.bg);
    assert.equal(manifest.theme_color, appTheme.colors.bg);
  });

  it('lists icons that exist, including a maskable one', () => {
    assert.ok(manifest.icons.some(({ sizes }) => sizes === '192x192'));
    assert.ok(manifest.icons.some(({ sizes }) => sizes === '512x512'));
    assert.ok(manifest.icons.some(({ purpose }) => purpose === 'maskable'));

    for (const { src } of manifest.icons) {
      assert.ok(existsSync(join(publicDir, src)), `${src} is missing`);
    }
  });
});
