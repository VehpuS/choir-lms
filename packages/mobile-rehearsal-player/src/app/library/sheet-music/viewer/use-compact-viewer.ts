import { useRef } from 'react';
import { useWindowDimensions } from 'react-native';

import { resolveCompactViewer } from './layout-model';
import { useIsTextFieldFocused } from './use-text-field-focus';

/** Whether the viewer uses its compact layout, held steady while a text field has focus. */
export const useCompactViewer = (): boolean => {
  const { height } = useWindowDimensions();
  const isTyping = useIsTextFieldFocused();
  const previous = useRef(false);
  const isCompact = resolveCompactViewer({
    isTyping,
    previous: previous.current,
    windowHeight: height,
  });

  previous.current = isCompact;

  return isCompact;
};
