import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INITIAL_VIEWER_ZOOM_STATE,
  computeFitZoom,
  reduceViewerZoom,
  resolveViewerZoom,
} from './fit-zoom-model';

test('a score that fits is shown at full size, never enlarged', () => {
  assert.equal(computeFitZoom({ availableHeight: 600, naturalHeight: 416 }), 1);
});

test('a score taller than the space shrinks to the height available', () => {
  const zoom = computeFitZoom({ availableHeight: 284, naturalHeight: 416 });

  assert.ok(Math.abs(zoom - 284 / 416) < 1e-9);
});

test('the fit never goes below the floor, so a tall score scrolls instead', () => {
  assert.equal(
    computeFitZoom({ availableHeight: 150, naturalHeight: 800 }),
    0.5,
  );
});

test('an unmeasured height or score falls back to full size', () => {
  assert.equal(computeFitZoom({ availableHeight: 0, naturalHeight: 416 }), 1);
  assert.equal(computeFitZoom({ availableHeight: 284, naturalHeight: 0 }), 1);
});

test('zoom is full size until a fit has been measured', () => {
  assert.equal(resolveViewerZoom(INITIAL_VIEWER_ZOOM_STATE), 1);
});

test('a measured fit is used while auto-fit is on', () => {
  const state = reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, {
    type: 'measured',
    zoom: 0.68,
  });

  assert.equal(resolveViewerZoom(state), 0.68);
});

test('re-measuring after a rotation updates the zoom while auto-fit is on', () => {
  const portrait = reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, {
    type: 'measured',
    zoom: 1,
  });
  const landscape = reduceViewerZoom(portrait, {
    type: 'measured',
    zoom: 0.68,
  });

  assert.equal(resolveViewerZoom(landscape), 0.68);
});

test('the first manual step starts from the fitted zoom and turns auto-fit off', () => {
  const fitted = reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, {
    type: 'measured',
    zoom: 0.68,
  });
  const zoomedIn = reduceViewerZoom(fitted, { direction: 1, type: 'step' });

  // 0.68 rounds to 0.75 on the step grid, then one step up is 1.
  assert.equal(zoomedIn.fitEnabled, false);
  assert.equal(resolveViewerZoom(zoomedIn), 1);
});

test('a measurement does not override a manual zoom', () => {
  const manual = reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, {
    direction: 1,
    type: 'step',
  });
  const measured = reduceViewerZoom(manual, { type: 'measured', zoom: 0.6 });

  assert.equal(resolveViewerZoom(measured), 1.25);
});

test('Fit turns auto-fit back on and uses the latest measurement', () => {
  const manual = reduceViewerZoom(
    reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, {
      type: 'measured',
      zoom: 0.6,
    }),
    { direction: 1, type: 'step' },
  );
  const refit = reduceViewerZoom(manual, { type: 'fit' });

  assert.equal(resolveViewerZoom(refit), 0.6);
});

test('a gesture sets the zoom as given and turns auto-fit off', () => {
  const state = reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, {
    max: 4,
    type: 'set',
    zoom: 2.37,
  });

  assert.equal(state.fitEnabled, false);
  assert.equal(resolveViewerZoom(state), 2.37);
});

test('a gesture is held to the maximum it was given', () => {
  assert.equal(
    resolveViewerZoom(
      reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, { type: 'set', zoom: 9 }),
    ),
    3,
  );
  assert.equal(
    resolveViewerZoom(
      reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, {
        max: 4,
        type: 'set',
        zoom: 9,
      }),
    ),
    4,
  );
});

test('a step can go past the score maximum when the document allows it', () => {
  const atScoreMax = reduceViewerZoom(INITIAL_VIEWER_ZOOM_STATE, {
    max: 4,
    type: 'set',
    zoom: 3,
  });
  const stepped = reduceViewerZoom(atScoreMax, {
    direction: 1,
    max: 4,
    type: 'step',
  });

  assert.equal(resolveViewerZoom(stepped), 3.25);
});
