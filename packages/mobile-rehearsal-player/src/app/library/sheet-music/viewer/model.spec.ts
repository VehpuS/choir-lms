import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractScoreParts,
  type SheetMusicSource,
} from '@org/audio-library-models';
import { resolvePartSelection } from '@org/audio-library-models';

import {
  VIEWER_MAX_ZOOM,
  VIEWER_MIN_ZOOM,
  applyPartChip,
  buildPartChips,
  clampViewerZoom,
  describePartNotices,
  describeViewerFailure,
  filterViewableSources,
  formatViewerZoom,
  hasPartChoice,
  resolveExternalActionLabel,
  resolveExternalUrl,
  stepViewerZoom,
  type ViewerFailureReason,
} from './model.js';

const source = (
  location: SheetMusicSource['location'],
  format: SheetMusicSource['format'] = 'pdf',
): SheetMusicSource => ({
  addedAt: '2026-01-01T00:00:00.000Z',
  format,
  id: 's',
  label: 'Score',
  location,
});
const DRIVE = source({ fileId: 'f1', kind: 'drive', name: 'Score.pdf' });
const LINK = source({ kind: 'url', url: 'https://host.example/score.pdf' });

const scoreParts = (names: string[]) =>
  extractScoreParts(
    `<score-partwise><part-list>${names
      .map(
        (name, index) =>
          `<score-part id="P${index + 1}"><part-name>${name}</part-name></score-part>`,
      )
      .join('')}</part-list></score-partwise>`,
  );
const PIANO_VOCAL = scoreParts(['Soprano', 'Alto', 'Tenor', 'Bass', 'Piano']);

describe('viewable sources and external links', () => {
  it('keeps the formats the viewer can draw', () => {
    const formats = ['pdf', 'musicxml', 'midi', 'musescore', 'link'] as const;
    const kept = filterViewableSources(
      formats.map((format) => ({ ...LINK, format, id: format })),
    );

    assert.deepEqual(
      kept.map(({ format }) => format),
      ['pdf', 'musicxml', 'midi'],
    );
  });

  it('opens a link as is and a Drive file in Drive', () => {
    assert.equal(resolveExternalUrl(LINK), 'https://host.example/score.pdf');
    assert.equal(
      resolveExternalUrl(DRIVE),
      'https://drive.google.com/file/d/f1/view',
    );
    assert.equal(resolveExternalActionLabel(LINK), 'Open in browser');
    assert.equal(resolveExternalActionLabel(DRIVE), 'Open in Drive');
  });
});

describe('describeViewerFailure', () => {
  it('has no message for a cancelled load', () => {
    assert.equal(describeViewerFailure('aborted', LINK), undefined);
  });

  it('offers to reconnect when Drive access is needed', () => {
    const failure = describeViewerFailure('needs-drive-access', DRIVE);

    assert.equal(failure?.title, 'Drive access is needed');
    assert.deepEqual(failure?.actions, ['reconnect-drive']);
  });

  it('says a blocked host cannot be read, without implying the browser fixes it', () => {
    const failure = describeViewerFailure('blocked', LINK);

    assert.deepEqual(failure?.actions, ['open-external']);
    assert.match(failure?.message ?? '', /cannot read files from this site/);
  });

  it('tells an unreachable site from a Drive file with no connection', () => {
    assert.equal(
      describeViewerFailure('offline', LINK)?.title,
      'This site could not be reached',
    );
    assert.equal(
      describeViewerFailure('offline', DRIVE)?.title,
      'No connection',
    );
  });

  it('says what is wrong with a file that is not a score', () => {
    assert.match(
      describeViewerFailure('html-page', LINK)?.title ?? '',
      /web page/,
    );
    assert.match(
      describeViewerFailure('not-musicxml', LINK)?.title ?? '',
      /not a MusicXML/,
    );
    assert.match(
      describeViewerFailure('unreadable-encoding', LINK)?.message ?? '',
      /UTF-8/,
    );
  });

  it('says a file is too large and offers to open it elsewhere', () => {
    const failure = describeViewerFailure('too-large', LINK);

    assert.match(failure?.message ?? '', /25 MB/);
    assert.deepEqual(failure?.actions, ['open-external']);
  });

  it('gives every reason a title, a message, and at least one next step', () => {
    const reasons: ViewerFailureReason[] = [
      'needs-drive-access',
      'not-found',
      'blocked',
      'too-large',
      'unsupported',
      'html-page',
      'not-musicxml',
      'wrong-format',
      'unreadable-encoding',
      'offline',
      'unavailable',
      'invalid-score',
      'invalid-pdf',
      'password-protected',
      'unsupported-platform',
    ];

    for (const reason of reasons) {
      for (const item of [DRIVE, LINK]) {
        const failure = describeViewerFailure(reason, item);

        assert.ok(failure?.title && failure.message, reason);
        assert.ok(failure.actions.length > 0, reason);
      }
    }
  });

  it('keeps messages in sentence case and free of the word error', () => {
    for (const reason of ['not-found', 'offline', 'unavailable'] as const) {
      const failure = describeViewerFailure(reason, LINK);

      assert.doesNotMatch(`${failure?.title} ${failure?.message}`, /error/i);
    }
  });
});

describe('hasPartChoice', () => {
  it('offers no choice for a one-part file, named or not', () => {
    assert.equal(hasPartChoice(scoreParts(['Track 1'])), false);
    assert.equal(hasPartChoice(scoreParts(['Alto'])), false);
  });

  it('offers a choice once there are two parts, even unrecognized ones', () => {
    assert.equal(hasPartChoice(scoreParts(['Track 1', 'Track 2'])), true);
    assert.equal(hasPartChoice(PIANO_VOCAL), true);
  });

  it('offers no choice for a file with no parts', () => {
    assert.equal(hasPartChoice([]), false);
  });
});

describe('buildPartChips', () => {
  it('shows presets then one toggle per part, with the vocal parts on by default', () => {
    const chips = buildPartChips(
      PIANO_VOCAL,
      resolvePartSelection(PIANO_VOCAL, undefined),
    );

    assert.deepEqual(
      chips.map(({ label, isOn }) => [label, isOn]),
      [
        ['Vocal parts', true],
        ['All parts', false],
        ['Soprano', true],
        ['Alto', true],
        ['Tenor', true],
        ['Bass', true],
        ['Piano', false],
      ],
    );
  });

  it('leaves out the vocal preset when no part is recognized as vocal', () => {
    const parts = scoreParts(['Track 1', 'Track 2']);
    const chips = buildPartChips(parts, resolvePartSelection(parts, undefined));

    assert.deepEqual(
      chips.map(({ label }) => label),
      ['All parts', 'Track 1', 'Track 2'],
    );
    assert.equal(chips[0]?.isOn, true);
  });
});

describe('applyPartChip', () => {
  const resolved = resolvePartSelection(PIANO_VOCAL, undefined);
  const key = (name: string) =>
    `${PIANO_VOCAL.findIndex((part) => part.name === name)}:${name}`;

  it('switches a preset on', () => {
    assert.equal(applyPartChip(PIANO_VOCAL, resolved, 'all'), 'all');
    assert.equal(applyPartChip(PIANO_VOCAL, resolved, 'vocal'), 'vocal');
  });

  it('switching the piano on shows every part, saved as all', () => {
    assert.equal(applyPartChip(PIANO_VOCAL, resolved, key('Piano')), 'all');
  });

  it('switching one voice off saves the rest as a chosen set', () => {
    assert.deepEqual(applyPartChip(PIANO_VOCAL, resolved, key('Alto')), {
      include: [key('Soprano'), key('Tenor'), key('Bass')],
    });
  });

  it('keeps one part: switching off every part but Alto leaves only Alto', () => {
    let current = resolved;
    let selection: ReturnType<typeof applyPartChip>;

    for (const name of ['Soprano', 'Tenor', 'Bass']) {
      selection = applyPartChip(PIANO_VOCAL, current, key(name));
      current = resolvePartSelection(PIANO_VOCAL, selection);
    }

    assert.deepEqual(selection, { include: [key('Alto')] });
    // The last visible part cannot be switched off.
    assert.equal(applyPartChip(PIANO_VOCAL, current, key('Alto')), undefined);
  });

  it('saves a set that matches the vocal parts as the vocal preset', () => {
    const custom = resolvePartSelection(PIANO_VOCAL, {
      include: [key('Soprano')],
    });
    let current = custom;

    for (const name of ['Alto', 'Tenor', 'Bass']) {
      const selection = applyPartChip(PIANO_VOCAL, current, key(name));

      current = resolvePartSelection(PIANO_VOCAL, selection);
      if (name === 'Bass') {
        assert.equal(selection, 'vocal');
      }
    }
  });
});

describe('describePartNotices', () => {
  it('words each notice for the viewer', () => {
    assert.deepEqual(
      describePartNotices(['no-vocal-parts', 'saved-parts-missing']),
      [
        'No vocal parts were recognized, so all parts are shown.',
        'Some saved parts were not found in this file, so the vocal parts are shown.',
      ],
    );
    assert.deepEqual(describePartNotices([]), []);
  });
});

describe('zoom', () => {
  it('steps by a quarter and stays within the range', () => {
    assert.equal(stepViewerZoom(1, 1), 1.25);
    assert.equal(stepViewerZoom(1, -1), 0.75);
    assert.equal(stepViewerZoom(VIEWER_MAX_ZOOM, 1), VIEWER_MAX_ZOOM);
    assert.equal(stepViewerZoom(VIEWER_MIN_ZOOM, -1), VIEWER_MIN_ZOOM);
  });

  it('rounds an off-step zoom before stepping and clamps out-of-range values', () => {
    assert.equal(stepViewerZoom(1.1, 1), 1.25);
    assert.equal(clampViewerZoom(99), VIEWER_MAX_ZOOM);
    assert.equal(clampViewerZoom(0), VIEWER_MIN_ZOOM);
  });

  it('shows the zoom as a percentage', () => {
    assert.equal(formatViewerZoom(1), '100%');
    assert.equal(formatViewerZoom(1.25), '125%');
    assert.equal(formatViewerZoom(0.5), '50%');
  });
});
