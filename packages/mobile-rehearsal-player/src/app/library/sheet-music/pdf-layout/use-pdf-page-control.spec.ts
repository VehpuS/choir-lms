/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PdfLayout } from '@org/audio-library-models';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { usePdfPageControl } from './use-pdf-page-control.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Control = ReturnType<typeof usePdfPageControl>;

const mount = async (sourceKey: string, layout: PdfLayout = 'pages') => {
  const box: { current?: Control } = {};
  const Probe = (props: { layout: PdfLayout; sourceKey: string }) => {
    box.current = usePdfPageControl(props);

    return null;
  };
  let renderer: ReturnType<typeof create> | undefined;

  await act(async () => {
    renderer = create(createElement(Probe, { layout, sourceKey }));
  });

  return {
    box,
    rerender: async (next: { layout?: PdfLayout; sourceKey: string }) => {
      await act(async () => {
        renderer?.update(
          createElement(Probe, { layout: next.layout ?? layout, ...next }),
        );
      });
    },
  };
};

describe('usePdfPageControl', () => {
  it('has no page until the PDF reports one', async () => {
    const { box } = await mount('a');

    assert.equal(box.current?.page, undefined);
    assert.equal(box.current?.controls.indicator, undefined);
  });

  it('keeps the last reported page, so a surface drawn again can open on it', async () => {
    const { box } = await mount('a');

    await act(async () => {
      box.current?.onPageChange({ page: 30, pageCount: 81 });
    });

    assert.equal(box.current?.page, 30);
    assert.equal(box.current?.controls.indicator, 'Page 31 of 81');
  });

  it('forgets the page when the open source changes', async () => {
    const { box, rerender } = await mount('a');

    await act(async () => {
      box.current?.onPageChange({ page: 30, pageCount: 81 });
    });
    await rerender({ sourceKey: 'b' });

    assert.equal(box.current?.page, undefined);
    assert.equal(box.current?.controls.indicator, undefined);
  });

  it('turns to the next and previous page with a request each time', async () => {
    const { box } = await mount('a');

    await act(async () => {
      box.current?.onPageChange({ page: 5, pageCount: 10 });
    });
    await act(async () => {
      box.current?.next();
    });
    assert.deepEqual(box.current?.request, {
      animate: true,
      page: 6,
      token: 1,
    });

    await act(async () => {
      box.current?.previous();
    });
    assert.deepEqual(box.current?.request, {
      animate: true,
      page: 4,
      token: 2,
    });
  });

  it('jumps instantly when asked to go to a page', async () => {
    const { box } = await mount('a');

    await act(async () => {
      box.current?.goTo(40);
    });

    assert.deepEqual(box.current?.request, {
      animate: false,
      page: 40,
      token: 1,
    });
  });
});
