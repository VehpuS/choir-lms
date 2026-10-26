import { useEffect, useState } from 'react';

import { isEditableTarget, type FocusTarget } from './pdf-paging-input';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type FocusEventLike = {
  relatedTarget?: FocusTarget | null;
  target?: FocusTarget | null;
};
type FocusDocument = {
  activeElement: FocusTarget | null;
  addEventListener(
    type: string,
    listener: (event: FocusEventLike) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: FocusEventLike) => void,
  ): void;
};

/** Whether a text field or editable content has focus, kept current as focus moves. */
export const useIsTextFieldFocused = (): boolean => {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const doc = (globalThis as { document?: FocusDocument }).document;

    if (!doc) {
      return undefined;
    }

    setIsFocused(isEditableTarget(doc.activeElement));

    const onFocusIn = (event: FocusEventLike) =>
      setIsFocused(isEditableTarget(event.target));
    // The next element (if any) is named by `relatedTarget`; `activeElement`
    // has not moved yet while the old one is blurring.
    const onFocusOut = (event: FocusEventLike) =>
      setIsFocused(isEditableTarget(event.relatedTarget));

    doc.addEventListener('focusin', onFocusIn);
    doc.addEventListener('focusout', onFocusOut);

    return () => {
      doc.removeEventListener('focusin', onFocusIn);
      doc.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return isFocused;
};
