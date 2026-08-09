import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  getPlaybackMarqueeDistancePx,
  PLAYBACK_MARQUEE_GAP_PX,
  shouldAnimatePlaybackMarquee,
} from './playback-marquee-model';

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
  const [measurement, setMeasurement] = useState({ text: '', width: 0 });
  const shouldAnimate = shouldAnimatePlaybackMarquee({ enabled, text });
  const distancePx = getPlaybackMarqueeDistancePx({
    measuredTextWidth: measurement.text === text ? measurement.width : 0,
    text,
  });
  const handleTextLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;

    setMeasurement((currentMeasurement) => {
      if (
        currentMeasurement.text === text &&
        currentMeasurement.width === width
      ) {
        return currentMeasurement;
      }

      return { text, width };
    });
  };

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);

    if (!shouldAnimate || distancePx <= PLAYBACK_MARQUEE_GAP_PX) {
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
        <Text onLayout={handleTextLayout} style={[style, styles.scrollingText]}>
          {text}
        </Text>
        <Text style={[style, styles.scrollingText, styles.duplicateText]}>
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
  scrollingText: {
    flexShrink: 0,
  },
  duplicateText: {
    paddingLeft: PLAYBACK_MARQUEE_GAP_PX,
  },
});
