// Phosphor's per-icon source (imported by ./index.tsx to avoid bundling the
// whole icon set) passes `className` to <Svg> for react-native-web. Its README
// asks consumers to widen react-native-svg's props so that source typechecks.
import 'react-native-svg';

declare module 'react-native-svg' {
  interface SvgProps {
    className?: string;
  }
}
