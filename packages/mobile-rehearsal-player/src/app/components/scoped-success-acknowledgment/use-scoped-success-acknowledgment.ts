import { useEffect, useRef, useState } from 'react';

// A save-acknowledgment banner (e.g. "Loop saved") must stay visible until
// the user explicitly dismisses it, and must never resurface as though a
// fresh save just happened when the user returns to the screen that shows
// it. This hook centralizes both: `isActive` transitioning to false clears
// the acknowledgment outright (so returning later starts from nothing, not
// a stale card), and every `show()` stamps a fresh monotonic token so any
// in-flight auto-dismiss timer from a prior acknowledgment can't affect a
// newer one.
export type ScopedSuccessAcknowledgment<Payload> = Payload & {
  token: number;
};

type UseScopedSuccessAcknowledgmentOptions = {
  // When set, the acknowledgment auto-dismisses after this many
  // milliseconds, unless a screen reader is active (auto-dismiss timing
  // can't be tuned to how long content takes to be read aloud, so it's
  // skipped entirely rather than risking cutting a reader off) or the
  // acknowledgment currently has accessibility/keyboard focus (paused via
  // onFocus/onBlur below, so it never disappears mid-interaction).
  autoDismissMs?: number;
  isActive: boolean;
  // Injected rather than read from `AccessibilityInfo` directly, so this
  // hook stays a plain, platform-API-free unit that's easy to test; the
  // caller wires the real platform check.
  isScreenReaderEnabled: () => Promise<boolean>;
};

export const useScopedSuccessAcknowledgment = <Payload>({
  autoDismissMs,
  isActive,
  isScreenReaderEnabled,
}: UseScopedSuccessAcknowledgmentOptions) => {
  const [acknowledgment, setAcknowledgment] = useState<ScopedSuccessAcknowledgment<Payload> | null>(
    null,
  );
  const nextTokenRef = useRef(0);
  const isFocusedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoDismissTimer = () => {
    if (timeoutRef.current === null) {
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const scheduleAutoDismiss = (token: number) => {
    clearAutoDismissTimer();

    if (!autoDismissMs || isFocusedRef.current) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setAcknowledgment((current) => {
        return current?.token === token ? null : current;
      });
    }, autoDismissMs);
  };

  const show = (payload: Payload) => {
    nextTokenRef.current += 1;

    const token = nextTokenRef.current;

    setAcknowledgment({ ...payload, token });

    if (!autoDismissMs) {
      return;
    }

    void isScreenReaderEnabled().then((isEnabled) => {
      if (isEnabled || nextTokenRef.current !== token) {
        return;
      }

      scheduleAutoDismiss(token);
    });
  };

  const dismiss = () => {
    clearAutoDismissTimer();
    setAcknowledgment(null);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    clearAutoDismissTimer();
  };

  const handleBlur = () => {
    isFocusedRef.current = false;

    if (acknowledgment) {
      scheduleAutoDismiss(acknowledgment.token);
    }
  };

  useEffect(() => {
    if (isActive) {
      return;
    }

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setAcknowledgment(null);
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    acknowledgment,
    dismiss,
    onBlur: handleBlur,
    onFocus: handleFocus,
    show,
  };
};
