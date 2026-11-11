import type { ElementRef } from 'react';
import type { View } from 'react-native';

// The piano is web-only and the app's TypeScript config carries no DOM
// library, so the slice of the browser pointer API it uses is described
// structurally. react-native-web hands these handlers the DOM event, with
// the original under `nativeEvent` on some versions.
type DomPointerEvent = {
  button?: number;
  isPrimary?: boolean;
  pointerId: number;
  clientX: number;
  clientY: number;
  currentTarget?: {
    setPointerCapture?: (pointerId: number) => void;
  };
};

type RectElement = {
  getBoundingClientRect: () => { left: number; top: number; width: number };
};

export type PointerSample = {
  /** The button that changed (0 is the primary button, or a touch or pen contact); 0 when the event does not say. */
  button: number;
  id: number;
  /** False for the second and later fingers of a multi-touch gesture. */
  isPrimary: boolean;
  clientX: number;
  clientY: number;
};

export const readPointer = (event: unknown): PointerSample => {
  const wrapped = event as { nativeEvent?: DomPointerEvent } & DomPointerEvent;
  const source = wrapped.nativeEvent ?? wrapped;

  return {
    button: source.button ?? 0,
    id: source.pointerId,
    isPrimary: source.isPrimary ?? true,
    clientX: source.clientX,
    clientY: source.clientY,
  };
};

/**
 * Keeps move and up events coming after the finger leaves the element. React's
 * `currentTarget` is the element; the native event's is the root container.
 * Capture is a nicety (without it, moves outside the element are lost), so a
 * browser that refuses it must not stop the press.
 */
export const capturePointer = (event: unknown) => {
  const wrapped = event as { nativeEvent?: DomPointerEvent } & DomPointerEvent;
  const source = wrapped.nativeEvent ?? wrapped;

  try {
    (wrapped.currentTarget ?? source.currentTarget)?.setPointerCapture?.(
      source.pointerId,
    );
  } catch {
    // The pointer ended before it could be captured.
  }
};

/** A point relative to the element's top-left corner. */
export const pointRelativeTo = (
  element: ElementRef<typeof View> | null,
  sample: PointerSample,
): { x: number; y: number; width: number } => {
  const rect = (
    element as unknown as RectElement | null
  )?.getBoundingClientRect();

  return rect
    ? {
        x: sample.clientX - rect.left,
        y: sample.clientY - rect.top,
        width: rect.width,
      }
    : { x: 0, y: 0, width: 0 };
};
