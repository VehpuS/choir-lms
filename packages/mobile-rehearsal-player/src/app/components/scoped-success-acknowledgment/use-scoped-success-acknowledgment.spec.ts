import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useScopedSuccessAcknowledgment } from './use-scoped-success-acknowledgment';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const AUTO_DISMISS_MS = 5000;

type Payload = { message: string };

type HookResult = ReturnType<typeof useScopedSuccessAcknowledgment<Payload>>;

const renderHook = async (options: {
  autoDismissMs?: number;
  isActive: boolean;
  isScreenReaderEnabled?: () => Promise<boolean>;
}) => {
  const hookResultBox: { current: HookResult | null } = { current: null };
  const isScreenReaderEnabled =
    options.isScreenReaderEnabled ?? (async () => false);

  const Harness = (props: { isActive: boolean }) => {
    hookResultBox.current = useScopedSuccessAcknowledgment<Payload>({
      autoDismissMs: options.autoDismissMs,
      isActive: props.isActive,
      isScreenReaderEnabled,
    });
    return null;
  };

  let renderer!: ReactTestRenderer;

  await act(async () => {
    renderer = create(createElement(Harness, { isActive: options.isActive }));
  });

  return {
    hookResultBox,
    renderer,
    setActive: async (isActive: boolean) => {
      await act(async () => {
        renderer.update(createElement(Harness, { isActive }));
      });
    },
  };
};

describe('useScopedSuccessAcknowledgment', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout'] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('shows an acknowledgment and dismiss clears it', async () => {
    const { hookResultBox, renderer } = await renderHook({ isActive: true });

    act(() => {
      hookResultBox.current?.show({ message: 'Loop saved' });
    });

    assert.deepEqual(hookResultBox.current?.acknowledgment, {
      message: 'Loop saved',
      token: 1,
    });

    act(() => {
      hookResultBox.current?.dismiss();
    });

    assert.equal(hookResultBox.current?.acknowledgment, null);

    act(() => {
      renderer.unmount();
    });
  });

  it('clears the acknowledgment when isActive goes false, so returning does not resurface it', async () => {
    const { hookResultBox, renderer, setActive } = await renderHook({
      isActive: true,
    });

    act(() => {
      hookResultBox.current?.show({ message: 'Loop saved' });
    });

    assert.notEqual(hookResultBox.current?.acknowledgment, null);

    // Simulate navigating away from the screen/view that owns this banner.
    await setActive(false);

    assert.equal(hookResultBox.current?.acknowledgment, null);

    // Returning to the screen/view must not resurface the stale banner.
    await setActive(true);

    assert.equal(hookResultBox.current?.acknowledgment, null);

    act(() => {
      renderer.unmount();
    });
  });

  it('a dismissed acknowledgment stays dismissed and is not resurrected by an isActive toggle', async () => {
    const { hookResultBox, renderer, setActive } = await renderHook({
      isActive: true,
    });

    act(() => {
      hookResultBox.current?.show({ message: 'Loop saved' });
    });

    act(() => {
      hookResultBox.current?.dismiss();
    });

    await setActive(false);
    await setActive(true);

    assert.equal(hookResultBox.current?.acknowledgment, null);

    act(() => {
      renderer.unmount();
    });
  });

  it('auto-dismisses after autoDismissMs when nothing is focused and no screen reader is active', async () => {
    const { hookResultBox, renderer } = await renderHook({
      autoDismissMs: AUTO_DISMISS_MS,
      isActive: true,
    });

    act(() => {
      hookResultBox.current?.show({ message: 'Loop saved' });
    });

    // Let the async screen-reader check resolve before advancing the timer.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.notEqual(hookResultBox.current?.acknowledgment, null);

    act(() => {
      mock.timers.tick(AUTO_DISMISS_MS);
    });

    assert.equal(hookResultBox.current?.acknowledgment, null);

    act(() => {
      renderer.unmount();
    });
  });

  it('does not schedule an auto-dismiss at all when a screen reader is active', async () => {
    const { hookResultBox, renderer } = await renderHook({
      autoDismissMs: AUTO_DISMISS_MS,
      isActive: true,
      isScreenReaderEnabled: async () => true,
    });

    act(() => {
      hookResultBox.current?.show({ message: 'Loop saved' });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      mock.timers.tick(AUTO_DISMISS_MS * 4);
    });

    assert.notEqual(hookResultBox.current?.acknowledgment, null);

    act(() => {
      renderer.unmount();
    });
  });

  it('pauses the auto-dismiss timer while focused and resumes a fresh window on blur', async () => {
    const { hookResultBox, renderer } = await renderHook({
      autoDismissMs: AUTO_DISMISS_MS,
      isActive: true,
    });

    act(() => {
      hookResultBox.current?.show({ message: 'Loop saved' });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      mock.timers.tick(AUTO_DISMISS_MS - 1000);
    });

    // A screen-reader/keyboard user lands on the card just before it would
    // have auto-dismissed.
    act(() => {
      hookResultBox.current?.onFocus();
    });

    act(() => {
      mock.timers.tick(AUTO_DISMISS_MS * 2);
    });

    assert.notEqual(
      hookResultBox.current?.acknowledgment,
      null,
      'a focused acknowledgment must not auto-dismiss out from under the user',
    );

    act(() => {
      hookResultBox.current?.onBlur();
    });

    act(() => {
      mock.timers.tick(AUTO_DISMISS_MS - 1);
    });

    assert.notEqual(hookResultBox.current?.acknowledgment, null);

    act(() => {
      mock.timers.tick(1);
    });

    assert.equal(hookResultBox.current?.acknowledgment, null);

    act(() => {
      renderer.unmount();
    });
  });
});
