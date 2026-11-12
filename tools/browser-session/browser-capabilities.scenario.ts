import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// A probe, not a test of the app: it reports what this browser can do that the
// offline files and the composite engine depend on, so a failure in one browser
// (WebKit in CI) can be told apart from an app bug. It always passes; read the
// PASS lines. Facts: can a Blob go into IndexedDB and come back (what Keep
// offline does), can an AudioWorklet load from a blob URL under the page's
// policy (the composite engine, pitch and recording), and which audio APIs exist.
const track = buildMockSource('Soprano Part');

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const PROBE = `
  (async () => {
    const out = {};
    out.userAgent = navigator.userAgent.replace(/\\s+/g, ' ').slice(0, 90);
    out.audioContext = typeof AudioContext;
    out.audioWorkletNode = typeof AudioWorkletNode;
    out.offlineAudioContext = typeof OfflineAudioContext;
    out.storagePersist = typeof (navigator.storage && navigator.storage.persist);
    const roundTrip = (size) => new Promise((resolve) => {
      const open = indexedDB.open('probe-' + size, 1);
      open.onupgradeneeded = () => open.result.createObjectStore('b');
      open.onerror = () => resolve('open failed: ' + (open.error && open.error.name));
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('b', 'readwrite');
        try { tx.objectStore('b').put(new Blob([new Uint8Array(size)]), 'k'); }
        catch (error) { resolve('put threw ' + error.name + ': ' + error.message); return; }
        tx.onerror = () => resolve('transaction error ' + (tx.error && tx.error.name) + ': ' + (tx.error && tx.error.message));
        tx.onabort = () => resolve('transaction aborted ' + (tx.error && tx.error.name) + ': ' + (tx.error && tx.error.message));
        tx.oncomplete = () => {
          const get = db.transaction('b').objectStore('b').get('k');
          get.onsuccess = () => resolve(get.result instanceof Blob ? 'ok, ' + get.result.size + ' bytes back' : 'came back as ' + typeof get.result);
          get.onerror = () => resolve('get error ' + (get.error && get.error.name));
        };
      };
    });
    out.indexedDbSmallBlob = await roundTrip(3);
    out.indexedDb430kBlob = await roundTrip(430000);
    try {
      const context = new AudioContext();
      const source = 'registerProcessor("probe", class extends AudioWorkletProcessor { process() { return true; } });';
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      out.audioWorkletFromBlobUrl = await context.audioWorklet.addModule(url).then(() => 'ok', (error) => error.name + ': ' + error.message);
      out.audioContextState = context.state;
    } catch (error) {
      out.audioWorkletFromBlobUrl = 'threw ' + error.name + ': ' + error.message;
    }
    return out;
  })()
`;

void runScenario({
  library: { playlists: [], sources: [track] },
  steps: async ({ page, pass }) => {
    await waitForTrack(page, 'Soprano Part');

    const facts = await page.evaluate<Record<string, string>>(PROBE);

    for (const [name, value] of Object.entries(facts)) {
      pass(`${name}: ${value}`);
    }
  },
});
