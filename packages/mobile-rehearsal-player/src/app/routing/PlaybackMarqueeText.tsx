import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

const MARQUEE_CHARACTER_THRESHOLD = 24;
const MARQUEE_CHARACTER_WIDTH_PX = 8;
const MARQUEE_GAP_PX = 28;

type PlaybackMarqueeTextProps = {
  containerStyle?: StyleProp<ViewStyle>;
  enabled: boolean;
  style?: StyleProp<TextStyle>;
  text: string;
};

export const PlaybackMarqueeText = ({
  containerStyle,
  enabled,
  style,
  text,
}: PlaybackMarqueeTextProps) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const overflowCharacterCount = Math.max(
    0,
    text.length - MARQUEE_CHARACTER_THRESHOLD,
  );
  const shouldAnimate = enabled && overflowCharacterCount > 0;
  const distancePx =
    overflowCharacterCount * MARQUEE_CHARACTER_WIDTH_PX + MARQUEE_GAP_PX;

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);

    if (!shouldAnimate || distancePx <= MARQUEE_GAP_PX) {
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(translateX, {
          toValue: -distancePx,
          duration: Math.max(2600, distancePx * 22),
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(350),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [distancePx, shouldAnimate, translateX]);

  if (!shouldAnimate) {
    return (
      <Text numberOfLines={1} style={style}>
        {text}
      </Text>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.row, { transform: [{ translateX }] }]}>
        <Text numberOfLines={1} style={style}>
          {text}
        </Text>
        <Text numberOfLines={1} style={[style, styles.duplicateText]}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duplicateText: {
    paddingLeft: MARQUEE_GAP_PX,
  },
});
