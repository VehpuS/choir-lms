import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { inspectSheetMusicBytes } from './sheet-music-content.js';

const bytesOf = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));

const MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<!-- <score-timewise> in a comment is not the root -->
<score-partwise version="3.1"><part-list/></score-partwise>`;

describe('inspectSheetMusicBytes', () => {
  it('accepts a PDF by its header and refuses an HTML page', () => {
    assert.deepEqual(
      inspectSheetMusicBytes('pdf', bytesOf('%PDF-1.7\n%âãÏÓ')),
      { isValid: true, isCompressed: false },
    );
    assert.deepEqual(
      inspectSheetMusicBytes('pdf', bytesOf('<!doctype html><title>Sign in')),
      { isValid: false },
    );
  });

  it('accepts a MIDI file by its header and refuses anything else', () => {
    assert.deepEqual(
      inspectSheetMusicBytes('midi', bytesOf('MThd\0\0\0\u0006')),
      {
        isValid: true,
        isCompressed: false,
      },
    );
    assert.deepEqual(inspectSheetMusicBytes('midi', bytesOf('RIFF')), {
      isValid: false,
    });
  });

  it('accepts MusicXML with a partwise or timewise root', () => {
    assert.deepEqual(inspectSheetMusicBytes('musicxml', bytesOf(MUSICXML)), {
      isValid: true,
      isCompressed: false,
    });
    assert.deepEqual(
      inspectSheetMusicBytes(
        'musicxml',
        bytesOf('<score-timewise version="3.1"></score-timewise>'),
      ),
      { isValid: true, isCompressed: false },
    );
  });

  it('flags a compressed .mxl by its zip header', () => {
    assert.deepEqual(
      inspectSheetMusicBytes('musicxml', bytesOf('PK\u0003\u0004rest')),
      { isValid: true, isCompressed: true },
    );
  });

  it('refuses a .xml that is not MusicXML, even one that mentions the root name', () => {
    for (const text of [
      '<?xml version="1.0"?><rss version="2.0"></rss>',
      '<html>score-partwise</html>',
      '<!-- <score-partwise> --><note/>',
      '',
    ]) {
      assert.deepEqual(inspectSheetMusicBytes('musicxml', bytesOf(text)), {
        isValid: false,
      });
    }
  });
});
