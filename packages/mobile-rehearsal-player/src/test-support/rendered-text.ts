import { screen } from '@testing-library/react-native/pure';

// Testing Library finds text by a host component named `Text`, but under
// react-native-web `Text` renders as a `div`, so `getByText` sees nothing.
// Labels (`getByLabelText`) and presses work as on a device; for visible text,
// look through the rendered tree instead.
export const hasRenderedText = (text: string): boolean => {
  return JSON.stringify(screen.toJSON()).includes(
    JSON.stringify(text).slice(1, -1),
  );
};
