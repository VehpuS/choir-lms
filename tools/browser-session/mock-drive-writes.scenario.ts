import { buildDefaultMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { runScenario } from './scenario-runner';

// Proves the writable mock Drive: what is created, uploaded (multipart and
// resumable), renamed, trashed and deleted is kept and answered back like
// Drive does, and the session can hold the write scope. This is the base the
// backup, restore and share scenarios stand on.
const AUTH_KEY = 'choirlms.google-drive.authorization';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

void runScenario({
  // The mock Drive answers a chunked upload with 308 Resume Incomplete, a
  // redirect status Playwright's WebKit cannot fulfil.
  requires: ['chromium', 'firefox'],
  drive: { state: 'authorized', writeAccess: true },
  library: buildDefaultMockLibrary(),
  steps: async ({ page, pass, session }) => {
    await page.getByLabel('Alto Part options').first().waitFor();

    const stored = await session.readStored<{ scope?: string }>(AUTH_KEY);

    if (!stored?.scope?.includes(WRITE_SCOPE)) {
      throw new Error('the authorized session does not hold the write scope');
    }

    pass('The session can hold the write scope');

    // All requests are made from the page, as the app makes them. The script is
    // a plain string because a function passed to `evaluate` would carry the
    // helper calls tsx adds, which do not exist in the page.
    const result = (await page.evaluate(`(async () => {
      const api = ${JSON.stringify(API)};
      const upload = ${JSON.stringify(UPLOAD)};
      const headers = { Authorization: 'Bearer mock' };
      const call = (url, init = {}) =>
        fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
      const jsonOf = async (url, init) => (await call(url, init)).json();
      const post = (url, body, type = 'application/json', method = 'POST') =>
        call(url, { body, headers: { 'Content-Type': type }, method });
      const out = {};

      out.about = (await jsonOf(api + '/about?fields=user')).user;

      const folder = await (await post(api + '/files', JSON.stringify({
        mimeType: 'application/vnd.google-apps.folder', name: 'Backups', parents: ['root'],
      }))).json();

      out.folderId = folder.id;

      // Multipart upload with an app property.
      const boundary = 'b-test';
      const multipart =
        '--' + boundary + '\\r\\nContent-Type: application/json\\r\\n\\r\\n' +
        JSON.stringify({
          appProperties: { choirlmsBundle: 'v1' }, mimeType: 'application/json',
          name: 'choir-lms-test.json', parents: [folder.id],
        }) +
        '\\r\\n--' + boundary + '\\r\\nContent-Type: application/json\\r\\n\\r\\n{"hello":"world"}\\r\\n--' + boundary + '--';
      const uploaded = await (await post(
        upload + '?uploadType=multipart&supportsAllDrives=true', multipart,
        'multipart/related; boundary=' + boundary,
      )).json();

      out.multipartBack = await (await call(api + '/files/' + uploaded.id + '?alt=media')).text();

      // Resumable upload in two ranges.
      const init = await post(upload + '?uploadType=resumable', JSON.stringify({
        mimeType: 'audio/wav', name: 'take.wav', parents: [folder.id],
      }));
      const location = init.headers.get('Location');
      const first = await call(location, { body: 'AAAA', headers: { 'Content-Range': 'bytes 0-3/8' }, method: 'PUT' });

      out.firstStatus = first.status;

      const second = await call(location, { body: 'BBBB', headers: { 'Content-Range': 'bytes 4-7/8' }, method: 'PUT' });
      const resumed = await second.json();

      out.resumableBack = await (await call(api + '/files/' + resumed.id + '?alt=media')).text();

      const list = async (query) =>
        (await jsonOf(api + '/files?q=' + encodeURIComponent(query))).files.map((file) => file.name).sort();
      const inFolder = "trashed = false and '" + folder.id + "' in parents";

      out.inFolder = await list(inFolder);
      out.marked = await list("appProperties has { key='choirlmsBundle' and value='v1' }");

      // Rename, trash, delete.
      await post(api + '/files/' + uploaded.id, JSON.stringify({ name: 'renamed.json' }), 'application/json', 'PATCH');
      await post(api + '/files/' + resumed.id, JSON.stringify({ trashed: true }), 'application/json', 'PATCH');
      out.afterEdits = await list(inFolder);
      await call(api + '/files/' + uploaded.id, { method: 'DELETE' });
      out.afterDelete = (await call(api + '/files/' + uploaded.id + '?alt=media')).status;

      return out;
    })()`)) as Record<string, unknown>;
    const expect = (label: string, actual: unknown, expected: unknown) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
          `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        );
      }
    };

    expect(
      'about',
      (result.about as { emailAddress: string }).emailAddress,
      'member@example.test',
    );
    pass('about returns the signed-in user');

    expect('multipart round trip', result.multipartBack, '{"hello":"world"}');
    pass('A multipart upload is stored and downloads back unchanged');

    expect('first range', result.firstStatus, 308);
    expect('resumable round trip', result.resumableBack, 'AAAABBBB');
    pass('A resumable upload in two ranges is assembled and downloads back');

    expect('folder listing', result.inFolder, [
      'choir-lms-test.json',
      'take.wav',
    ]);
    expect('marked listing', result.marked, ['choir-lms-test.json']);
    pass('Listing finds files by folder and by the app property');

    expect('after rename and trash', result.afterEdits, ['renamed.json']);
    pass('Rename and trash change what a listing returns');

    expect('after delete', result.afterDelete, 404);
    pass('A deleted file is gone');

    // What the mock holds is readable from the scenario too.
    const names = session.drive.store
      .list("'" + String(result.folderId) + "' in parents")
      .map((record) => record.name);

    if (names.length === 0) {
      throw new Error('the scenario cannot read the mock Drive store');
    }

    pass('The scenario can read the mock Drive store');
  },
});
