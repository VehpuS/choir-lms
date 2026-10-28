import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IDLE_READING, type PitchState } from '../pitch-store-types.js';
import { resolveTarget } from './pitch-focus-model.js';
import {
  getPitchViewLayout,
  getReadoutBar,
  getTargetChip,
  getViewReadout,
  holdFromScale,
  toggleHeld,
} from './pitch-view-model.js';
import { A3, B3, reading } from './pitch-test-histories.js';

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

describe('pitch view layout', () => {
  it('puts the focus panel beside the roll only when held sideways', () => {
    assert.equal(getPitchViewLayout(390, 844), 'portrait');
    assert.equal(getPitchViewLayout(844, 390), 'landscape');
    assert.equal(getPitchViewLayout(600, 600), 'portrait');
  });
});

describe('pitch view readout', () => {
  it('shows the note, cents and the zone in words', () => {
    const readout = getViewReadout(
      stateWith({ reading: reading(A3, 8) }),
      null,
    );

    assert.equal(readout.kind, 'note');
    assert.deepEqual(
      readout.kind === 'note' && readout.distanceText,
      '+8 cents',
    );
    assert.equal(readout.kind === 'note' && readout.zoneLabel, 'Precise');
    assert.equal(
      readout.kind === 'note' && readout.spokenLabel,
      'A3, +8 cents, Precise',
    );
  });

  it('says Quarter tone off about 40 cents sharp', () => {
    const readout = getViewReadout(
      stateWith({ reading: reading(A3, 40) }),
      null,
    );

    assert.equal(
      readout.kind === 'note' && readout.zoneLabel,
      'Quarter tone off',
    );
  });

  it('measures from a held target, past 50 cents, as Off pitch', () => {
    const readout = getViewReadout(stateWith({ reading: reading(B3, 0) }), A3);

    assert.equal(readout.kind === 'note' && readout.name, 'B3');
    assert.equal(
      readout.kind === 'note' && readout.distanceText,
      '+200 from A3',
    );
    assert.equal(readout.kind === 'note' && readout.zone, 'off-pitch');
  });

  it('keeps the zone while the pipeline holds the last note through a gap', () => {
    const held = { ...reading(A3, 4), held: true } as PitchState['reading'];
    const readout = getViewReadout(stateWith({ reading: held }), null);

    assert.equal(readout.kind === 'note' && readout.zoneLabel, 'Precise');
  });

  it('shows the idle readout while listening and nothing is sung', () => {
    const readout = getViewReadout(stateWith({}), null);

    assert.deepEqual(readout, {
      kind: 'idle',
      title: 'Listening',
      detail: 'sing a note',
    });
  });

  it('turns a blocked microphone into a warning with the Listen button', () => {
    const readout = getViewReadout(stateWith({ status: 'blocked' }), null);

    assert.equal(readout.kind, 'message');
    assert.equal(readout.kind === 'message' && readout.tone, 'warning');
    assert.equal(readout.kind === 'message' && readout.action?.kind, 'listen');
  });

  it('shows paused and not listening as plain messages, never a note', () => {
    const withNote = reading(A3, 0);

    for (const status of ['paused-hidden', 'off', 'interrupted'] as const) {
      const readout = getViewReadout(
        stateWith({ status, reading: withNote }),
        null,
      );

      assert.equal(readout.kind, 'message');
      assert.equal(readout.kind === 'message' && readout.tone, 'neutral');
    }
  });

  it('carries the explanation and its Continue button', () => {
    const readout = getViewReadout(stateWith({ status: 'explain' }), null);

    assert.equal(
      readout.kind === 'message' && readout.action?.label,
      'Continue',
    );
  });
});

describe('pitch view readout bar', () => {
  it('shows pitch, confidence and state while sounding', () => {
    const bar = getReadoutBar(stateWith({ reading: reading(A3, 0) }));

    assert.equal(bar.pitchText, 'A3');
    assert.equal(bar.confidenceText, '95%');
    assert.equal(bar.statusText, 'Listening');
    assert.equal(bar.statusTone, 'ok');
    assert.equal(bar.listenLabel, 'Stop');
  });

  it('shows dashes with nothing sung', () => {
    const bar = getReadoutBar(stateWith({}));

    assert.equal(bar.pitchText, '--');
    assert.equal(bar.confidenceText, '--');
  });

  it('offers Listen when the user has listening off', () => {
    const bar = getReadoutBar(stateWith({ status: 'off', listening: false }));

    assert.equal(bar.listenLabel, 'Listen');
    assert.equal(bar.statusTone, 'off');
    assert.equal(bar.statusText, 'Not listening');
  });

  it('keeps Stop while paused or blocked, flagging the state as a warning', () => {
    const paused = getReadoutBar(stateWith({ status: 'paused-hidden' }));
    const blocked = getReadoutBar(stateWith({ status: 'blocked' }));

    assert.equal(paused.listenLabel, 'Stop');
    assert.equal(paused.statusTone, 'warn');
    assert.equal(blocked.statusTone, 'warn');
  });
});

describe('pitch view target', () => {
  it('labels the nearest note and a held note, shorter when sideways', () => {
    const nearest = resolveTarget(null, reading(A3, 0));
    const held = resolveTarget(A3, reading(B3, 0));

    assert.equal(
      getTargetChip(nearest, 'portrait').label,
      'Target: nearest note',
    );
    assert.equal(getTargetChip(nearest, 'landscape').label, 'Target: nearest');
    assert.equal(getTargetChip(held, 'portrait').label, 'Target: A3 (held)');
    assert.equal(getTargetChip(held, 'landscape').label, 'Target: A3');
    assert.equal(getTargetChip(held, 'portrait').isHeld, true);
  });

  it('holds the note being sung, and lets go on a second press', () => {
    const singing = stateWith({ reading: reading(A3, 0) });

    assert.equal(toggleHeld(null, singing), A3);
    assert.equal(toggleHeld(A3, singing), null);
  });

  it('holds nothing when nothing is sung', () => {
    assert.equal(toggleHeld(null, stateWith({})), null);
  });

  it('holds a note pressed on the roll scale, and releases it on a second press', () => {
    assert.equal(holdFromScale(null, A3), A3);
    assert.equal(holdFromScale(B3, A3), A3);
    assert.equal(holdFromScale(A3, A3), null);
  });
});
