import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { addContentSecurityPolicy } from '../../packages/mobile-rehearsal-player/src/config/web-content-security-policy';

// Adds the web app's Content-Security-Policy to an exported site's index.html
// (the `build` and `build-browser-test` targets run it after `expo export`):
//   tsx tools/web-csp/inject-csp.ts <export directory>
// Not part of the page the dev server serves; see the policy's own comment.
const exportDirectory = process.argv[2];

if (!exportDirectory) {
  console.error('Usage: tsx tools/web-csp/inject-csp.ts <export directory>');
  process.exit(1);
}

const indexPath = join(exportDirectory, 'index.html');

writeFileSync(
  indexPath,
  addContentSecurityPolicy(readFileSync(indexPath, 'utf8')),
);
console.log(`Content-Security-Policy added to ${indexPath}`);
