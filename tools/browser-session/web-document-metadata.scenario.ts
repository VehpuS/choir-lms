import assert from 'node:assert/strict';

import { appTheme } from '../../packages/mobile-rehearsal-player/src/app/utils/theme';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.1 (F1, F2): the served page carries the
// metadata a browser and an installed app read, and the manifest it links
// resolves. Runs offline against the local export.
// A missing tag should fail fast, not wait out the default 30 s.
const ATTRIBUTE_TIMEOUT_MS = 2000;

type ManifestIcon = { sizes?: string; src: string };
type Manifest = {
  display?: string;
  icons?: ManifestIcon[];
  id?: string;
  name?: string;
  scope?: string;
  start_url?: string;
};

void runScenario({
  library: { playlists: [], sources: [buildMockSource('Soprano Part')] },
  steps: async ({ page, pass }) => {
    const metaContent = (selector: string) =>
      page
        .locator(selector)
        .first()
        .getAttribute('content', { timeout: ATTRIBUTE_TIMEOUT_MS });

    assert.ok(
      (await metaContent('meta[name="description"]'))?.trim(),
      'the page has no meta description',
    );
    pass('The page has a description');

    assert.equal(
      (await metaContent('meta[name="theme-color"]'))?.toLowerCase(),
      appTheme.colors.bg.toLowerCase(),
      'theme-color does not match the app background',
    );
    pass('theme-color matches the app background');

    // The served source, not the parsed DOM: the parser drops an unknown
    // attribute silently, which is how the JSX-cased one went unnoticed.
    const source = await (await page.request.get(page.url())).text();

    assert.doesNotMatch(
      source,
      /httpEquiv/,
      'the HTML has a JSX-cased attribute',
    );
    pass('The served HTML has no JSX-cased attributes');

    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .first()
      .getAttribute('href', { timeout: ATTRIBUTE_TIMEOUT_MS });

    assert.ok(manifestHref, 'the page links no web app manifest');

    const manifestUrl = new URL(manifestHref, page.url()).toString();
    const response = await page.request.get(manifestUrl);

    assert.ok(response.ok(), `the manifest did not load: ${manifestUrl}`);

    const manifest = (await response.json()) as Manifest;

    assert.ok(manifest.id, 'the manifest has no id');
    assert.ok(manifest.name, 'the manifest has no name');
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.start_url, 'the manifest has no start_url');
    assert.ok(
      new URL(manifest.start_url, manifestUrl).pathname.startsWith(
        new URL(manifest.scope ?? '.', manifestUrl).pathname,
      ),
      'start_url is outside the manifest scope',
    );
    pass(
      'The manifest loads, with an id, a name, standalone display and a scope',
    );

    assert.ok(manifest.icons?.length, 'the manifest has no icons');

    for (const icon of manifest.icons) {
      const iconResponse = await page.request.get(
        new URL(icon.src, manifestUrl).toString(),
      );

      assert.ok(iconResponse.ok(), `icon did not load: ${icon.src}`);
    }
    pass('Every manifest icon loads');
  },
});
