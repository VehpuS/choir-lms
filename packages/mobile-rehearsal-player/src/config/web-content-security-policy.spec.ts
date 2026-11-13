import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  addContentSecurityPolicy,
  WEB_CONTENT_SECURITY_POLICY,
} from './web-content-security-policy';

const PAGE =
  '<!doctype html><html><head><meta charset="utf-8" /><title>x</title></head><body></body></html>';

describe('web content security policy', () => {
  it('forbids inline and eval script and plugins', () => {
    const scriptDirective = WEB_CONTENT_SECURITY_POLICY.split('; ').find(
      (directive) => directive.startsWith('script-src'),
    );

    assert.ok(scriptDirective);
    assert.doesNotMatch(scriptDirective, /'unsafe-(inline|eval)'/);
    assert.match(WEB_CONTENT_SECURITY_POLICY, /object-src 'none'/);
  });

  it('is added right after the charset tag', () => {
    const result = addContentSecurityPolicy(PAGE);

    assert.match(
      result,
      /<meta charset="utf-8" \/>\s*<meta http-equiv="Content-Security-Policy" content="default-src 'self'/,
    );
  });

  it('falls back to the head when there is no charset tag', () => {
    const result = addContentSecurityPolicy(
      '<html><head><title>x</title></head></html>',
    );

    assert.match(result, /<head>\s*<meta http-equiv="Content-Security-Policy"/);
  });

  it('refuses a page that already has a policy, or no head', () => {
    assert.throws(() =>
      addContentSecurityPolicy(addContentSecurityPolicy(PAGE)),
    );
    assert.throws(() => addContentSecurityPolicy('<p>no head</p>'));
  });

  it('is not in public/index.html, which the dev server serves too', () => {
    const html = readFileSync(
      join(__dirname, '..', '..', 'public', 'index.html'),
      'utf8',
    );

    assert.doesNotMatch(html, /http-equiv\s*=\s*["']Content-Security-Policy/i);
  });
});
