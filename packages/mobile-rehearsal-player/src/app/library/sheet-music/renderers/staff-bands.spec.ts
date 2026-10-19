import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildStaffBands,
  findPartNameAtY,
  flattenStaffNames,
} from './staff-bands';

describe('flattenStaffNames', () => {
  it('repeats a part name for each of its staves, in order', () => {
    assert.deepEqual(
      flattenStaffNames(
        [
          { name: 'Soprano', staffCount: 1 },
          { name: 'Piano', staffCount: 2 },
        ],
        3,
      ),
      ['Soprano', 'Piano', 'Piano'],
    );
  });

  it('gives nothing when the counts disagree with the staves drawn', () => {
    assert.equal(
      flattenStaffNames([{ name: 'Soprano', staffCount: 1 }], 2),
      undefined,
    );
  });
});

describe('buildStaffBands', () => {
  it('pairs each staff line with its name and skips lines with none', () => {
    assert.deepEqual(
      buildStaffBands(
        [
          { height: 40, y: 100 },
          { height: 40, y: 200 },
          { height: 40, y: 300 },
        ],
        ['Soprano', 'Alto'],
      ),
      [
        { bottom: 140, name: 'Soprano', top: 100 },
        { bottom: 240, name: 'Alto', top: 200 },
      ],
    );
  });
});

describe('findPartNameAtY', () => {
  const bands = [
    { bottom: 140, name: 'Soprano', top: 100 },
    { bottom: 240, name: 'Alto', top: 200 },
  ];

  it('names the part whose staff was tapped', () => {
    assert.equal(findPartNameAtY(bands, 120), 'Soprano');
    assert.equal(findPartNameAtY(bands, 100), 'Soprano');
    assert.equal(findPartNameAtY(bands, 240), 'Alto');
  });

  it('counts a tap just above or below a staff as on it', () => {
    assert.equal(findPartNameAtY(bands, 70, 40), 'Soprano');
    assert.equal(findPartNameAtY(bands, 270, 40), 'Alto');
  });

  it('lets the nearer staff win where two paddings overlap', () => {
    assert.equal(findPartNameAtY(bands, 160, 40), 'Soprano');
    assert.equal(findPartNameAtY(bands, 185, 40), 'Alto');
  });

  it('names nothing for blank space far from every staff', () => {
    assert.equal(findPartNameAtY(bands, 10, 40), undefined);
    assert.equal(findPartNameAtY(bands, 400, 40), undefined);
    assert.equal(findPartNameAtY([], 120), undefined);
  });
});
