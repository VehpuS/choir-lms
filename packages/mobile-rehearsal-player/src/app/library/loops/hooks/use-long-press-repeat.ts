import { useEffect, useRef } from 'react';

type UseLongPressRepeatOptions = {
  disabled?: boolean;
  fastRepeatAfterMs?: number;
  fastRepeatIntervalMs?: number;
  initialDelayMs?: number;
  onTrigger: () => void;
  repeatIntervalMs?: number;
};

const DEFAULT_INITIAL_DELAY_MS = 450;
const DEFAULT_REPEAT_INTERVAL_MS = 150;
const DEFAULT_FAST_REPEAT_AFTER_MS = 1500;
const DEFAULT_FAST_REPEAT_INTERVAL_MS = 60;

const GLOBAL_RELEASE_EVENTS = [
  'mouseup',
  'pointerup',
  'pointercancel',
  'touchend',
  'touchcancel',
] as const;

type BrowserEventListenerOptions = { capture?: boolean };

type BrowserEventTarget = {
  addEventListener: (
    type: string,
    listener: () => void,
    options?: BrowserEventListenerOptions,
  ) => void;
  removeEventListener: (
    type: string,
    listener: () => void,
    options?: BrowserEventListenerOptions,
  ) => void;
};

// Capture phase, so this fires before any target-level handler (RNW's own
// press responder included) has a chance to call stopPropagation and hide
// the real release from a bubble-phase listener on window/document.
const CAPTURE_LISTENER_OPTIONS: BrowserEventListenerOptions = {
  capture: true,
};

const getBrowserGlobals = () => {
  const globalObject = globalThis as typeof globalThis & {
    document?: BrowserEventTarget;
    window?: BrowserEventTarget;
  };

  return {
    browserDocument: globalObject.document,
    browserWindow: globalObject.window,
  };
};

export const useLongPressRepeat = (options: UseLongPressRepeatOptions) => {
  const {
    disabled = false,
    fastRepeatAfterMs = DEFAULT_FAST_REPEAT_AFTER_MS,
    fastRepeatIntervalMs = DEFAULT_FAST_REPEAT_INTERVAL_MS,
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
    onTrigger,
    repeatIntervalMs = DEFAULT_REPEAT_INTERVAL_MS,
  } = options;

  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accelerateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const didAutoRepeatRef = useRef(false);

  const detachGlobalReleaseListenersRef = useRef<(() => void) | null>(null);

  const clearTimers = () => {
    if (delayTimeoutRef.current !== null) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }

    if (accelerateTimeoutRef.current !== null) {
      clearTimeout(accelerateTimeoutRef.current);
      accelerateTimeoutRef.current = null;
    }

    if (repeatIntervalRef.current !== null) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }

    detachGlobalReleaseListenersRef.current?.();
    detachGlobalReleaseListenersRef.current = null;
  };

  useEffect(() => clearTimers, []);

  // A locally-attached onPressOut can miss the real release (e.g. the pointer
  // drifts off the button, or the tab loses focus) and leave the repeat
  // running. Back it up with page-level listeners for as long as a hold is
  // active, matching how native auto-repeat controls guard against a stuck
  // key/button.
  const attachGlobalReleaseListeners = () => {
    if (detachGlobalReleaseListenersRef.current) {
      return;
    }

    const { browserDocument, browserWindow } = getBrowserGlobals();

    if (!browserWindow) {
      return;
    }

    const releaseHandler = () => {
      clearTimers();
    };

    for (const eventName of GLOBAL_RELEASE_EVENTS) {
      browserWindow.addEventListener(
        eventName,
        releaseHandler,
        CAPTURE_LISTENER_OPTIONS,
      );
    }
    browserWindow.addEventListener('blur', releaseHandler);
    browserDocument?.addEventListener('visibilitychange', releaseHandler);

    detachGlobalReleaseListenersRef.current = () => {
      for (const eventName of GLOBAL_RELEASE_EVENTS) {
        browserWindow.removeEventListener(
          eventName,
          releaseHandler,
          CAPTURE_LISTENER_OPTIONS,
        );
      }
      browserWindow.removeEventListener('blur', releaseHandler);
      browserDocument?.removeEventListener('visibilitychange', releaseHandler);
    };
  };

  const startRepeatInterval = (intervalMs: number) => {
    if (repeatIntervalRef.current !== null) {
      clearInterval(repeatIntervalRef.current);
    }

    repeatIntervalRef.current = setInterval(() => {
      if (disabledRef.current) {
        clearTimers();
        return;
      }

      onTriggerRef.current();
    }, intervalMs);
  };

  const handlePressIn = () => {
    if (disabled) {
      return;
    }

    if (delayTimeoutRef.current !== null || repeatIntervalRef.current !== null) {
      // A hold is already in progress; ignore a re-entrant press-in instead
      // of stacking a second, overlapping repeat cycle.
      return;
    }

    didAutoRepeatRef.current = false;
    attachGlobalReleaseListeners();

    delayTimeoutRef.current = setTimeout(() => {
      if (disabledRef.current) {
        return;
      }

      didAutoRepeatRef.current = true;
      onTriggerRef.current();
      startRepeatInterval(repeatIntervalMs);

      accelerateTimeoutRef.current = setTimeout(() => {
        startRepeatInterval(fastRepeatIntervalMs);
      }, fastRepeatAfterMs);
    }, initialDelayMs);
  };

  const handlePressOut = () => {
    clearTimers();
  };

  const handlePress = () => {
    if (didAutoRepeatRef.current) {
      didAutoRepeatRef.current = false;
      return;
    }

    onTriggerRef.current();
  };

  return {
    onPress: handlePress,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
  };
};
