import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

// Renders the PNG icons the web manifest and the home-screen link need from the
// two SVG sources in assets/web-icons. Run it after changing a source:
//   npx tsx tools/web-icons/render-web-icons.ts
// The PNGs are committed (public/icons), so a build needs no browser.
const PACKAGE_DIR = join(
  __dirname,
  '..',
  '..',
  'packages',
  'mobile-rehearsal-player',
);
const SOURCE_DIR = join(PACKAGE_DIR, 'assets', 'web-icons');
const OUTPUT_DIR = join(PACKAGE_DIR, 'public', 'icons');

const ICONS = [
  { file: 'icon-192.png', size: 192, source: 'icon-any.svg' },
  { file: 'icon-512.png', size: 512, source: 'icon-any.svg' },
  { file: 'icon-maskable-512.png', size: 512, source: 'icon-maskable.svg' },
  // iOS draws its own corners, so the full-bleed square is what it wants.
  { file: 'apple-touch-icon.png', size: 180, source: 'icon-any.svg' },
] as const;

const main = async () => {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const { file, size, source } of ICONS) {
      const svg = readFileSync(join(SOURCE_DIR, source), 'utf8');
      const page = await browser.newPage({
        viewport: { height: size, width: size },
      });

      await page.setContent(
        `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
      );
      writeFileSync(join(OUTPUT_DIR, file), await page.screenshot());
      await page.close();
    }
  } finally {
    await browser.close();
  }
};

void main();
