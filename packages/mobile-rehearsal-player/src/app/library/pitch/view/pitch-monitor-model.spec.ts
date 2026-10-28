import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IDLE_READING, type PitchState } from '../pitch-store-types.js';
import { buildSparkline, getMonitorModel } from './pitch-monitor-model.js';
import { A3, C4, reading, sing } from './pitch-test-histories.js';

const stateWith = (patch: Partial<PitchState>): PitchState => ({
  status: 'listening',
  listening: true,
  permission: 'granted',
  reading: IDLE_READING,
  headphonesNotePending: false,
  backgroundNoticePending: false,
  levelCutoffDb: -40,
  referenceHz: 440,
  ...patch,
});

describe('monitor model: notes', () => {
  it('shows the note, signed cents and a gauge position', () => {
    const model = getMonitorModel(stateWith({ reading: reading(A3, -10) }));

    assert.equal(model.note?.name, 'A3');
    assert.equal(model.note?.centsText, '-10');
    assert.equal(model.note?.gauge, 0.4);
    assert.equal(model.note?.zone, 'precise');
    assert.equal(model.message, null);
  });

  it('puts sharp cents on the right and says so', () => {
    const model = getMonitorModel(stateWith({ reading: reading(A3, 8) }));

    assert.equal(model.note?.centsText, '+8');
    assert.equal(model.note?.gauge, 0.58);
    assert.equal(model.note?.spokenLabel, 'A3, 8 cents sharp');
  });

  it('reads flat and in-tune notes for assistive technology', () => {
    const flat = getMonitorModel(stateWith({ reading: reading(C4, -23) }));
    const centred = getMonitorModel(stateWith({ reading: reading(C4, 0.2) }));

    assert.equal(flat.note?.spokenLabel, 'C4, 23 cents flat');
    assert.equal(centred.note?.spokenLabel, 'C4, in tune');
    assert.equal(centred.note?.centsText, '0');
  });

  it('names the zone in words as well as the position', () => {
    const model = getMonitorModel(stateWith({ reading: reading(A3, 40) }));

    assert.equal(model.note?.zoneLabel, 'Quarter tone off');
  });

  it('shows the idle state with no note when nothing is sung', () => {
    const model = getMonitorModel(stateWith({}));

    assert.equal(model.note, null);
    assert.equal(model.message?.title, 'Listening');
    assert.equal(model.statusText, 'Listening');
  });
});

describe('monitor model: states in words', () => {
  const messageFor = (status: PitchState['status']) => {
    return getMonitorModel(stateWith({ status, listening: status !== 'off' }));
  };

  it('offers Listen when not listening', () => {
    const { message, statusText } = messageFor('off');

    assert.equal(statusText, 'Not listening');
    assert.deepEqual(message?.action, { kind: 'listen', label: 'Listen' });
  });

  it('explains before the browser prompt, with a Continue button', () => {
    const { message } = messageFor('explain');

    assert.match(message?.body ?? '', /never stored or sent/);
    assert.deepEqual(message?.action, { kind: 'continue', label: 'Continue' });
  });

  it('says how to allow a blocked microphone and offers Listen', () => {
    const { message, statusText } = messageFor('blocked');

    assert.equal(statusText, 'Microphone blocked');
    assert.match(message?.body ?? '', /address bar/);
    assert.equal(message?.action?.kind, 'listen');
  });

  it('tells a missing microphone and a busy one apart', () => {
    assert.equal(
      messageFor('unavailable').message?.title,
      'No microphone found.',
    );
    assert.equal(messageFor('in-use').message?.title, 'Microphone in use.');
  });

  it('says paused and interrupted resume on their own, with no button', () => {
    for (const status of ['paused-hidden', 'interrupted'] as const) {
      const { message } = messageFor(status);

      assert.match(message?.body ?? '', /resumes on its own/);
      assert.equal(message?.action, null);
    }
  });

  it('shows no note in any state but listening', () => {
    const withNote = reading(A3, 0);

    for (const status of ['off', 'blocked', 'interrupted'] as const) {
      const model = getMonitorModel(stateWith({ status, reading: withNote }));

      assert.equal(model.note, null);
    }
  });
});

describe('monitor model: one-time notes', () => {
  it('shows the headphones note first, only while listening', () => {
    const both = getMonitorModel(
      stateWith({ headphonesNotePending: true, backgroundNoticePending: true }),
    );
    const stopped = getMonitorModel(
      stateWith({ status: 'off', headphonesNotePending: true }),
    );

    assert.equal(both.notice?.kind, 'headphones');
    assert.match(both.notice?.text ?? '', /assumes headphones/);
    assert.equal(stopped.notice, null);
  });

  it('notes that listening resumed after the background', () => {
    const model = getMonitorModel(stateWith({ backgroundNoticePending: true }));

    assert.equal(model.notice?.kind, 'background');
  });

  it('shows no note once both are dismissed', () => {
    assert.equal(getMonitorModel(stateWith({})).notice, null);
  });
});

describe('monitor sparkline', () => {
  it('is empty with nothing sung', () => {
    const values = buildSparkline(sing([]).getSnapshot());

    assert.equal(values.length, 24);
    assert.ok(values.every((value) => value === null));
  });

  it('keeps a steady note flat and in the middle', () => {
    const values = buildSparkline(
      sing([{ midi: A3, cents: 0, seconds: 4 }]).getSnapshot(),
    ).filter((value): value is number => value !== null);

    assert.ok(values.length > 0);
    assert.ok(values.every((value) => Math.abs(value - 0.5) < 1e-9));
  });

  it('rises with the pitch and leaves gaps where nothing was sung', () => {
    const history = sing([{ midi: A3, cents: 0, seconds: 1 }]);

    sing([{ midi: C4, cents: 0, seconds: 1 }], 2500, history);

    const values = buildSparkline(history.getSnapshot());
    const sung = values.filter((value): value is number => value !== null);

    assert.ok(values.some((value) => value === null));
    assert.ok(sung[0] < sung[sung.length - 1]);
    assert.ok(sung.every((value) => value >= 0 && value <= 1));
  });
});
