import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import type { Size } from '../../view/pitch-view-geometry';

const UNMEASURED: Size = { width: 0, height: 0 };

/** The size of a box once laid out; zero until then, so nothing is drawn early. */
export const useMeasuredSize = () => {
  const [size, setSize] = useState<Size>(UNMEASURED);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setSize((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { width, height },
    );
  }, []);

  return { size, onLayout, isMeasured: size.width > 0 && size.height > 0 };
};
