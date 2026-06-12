import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { resolveSearchHighlightParts } from '../utils/saved-library-search-view-model';

type SearchHighlightedTextProps = Pick<TextProps, 'numberOfLines'> & {
  highlightStyle?: StyleProp<TextStyle>;
  query: string | null;
  style?: StyleProp<TextStyle>;
  text: string;
};

export const SearchHighlightedText = ({
  highlightStyle,
  numberOfLines,
  query,
  style,
  text,
}: SearchHighlightedTextProps) => {
  const highlightParts = resolveSearchHighlightParts({
    query,
    text,
  });

  if (highlightParts.length === 1 && !highlightParts[0]?.isHighlighted) {
    return (
      <Text numberOfLines={numberOfLines} style={style}>
        {text}
      </Text>
    );
  }

  return (
    <Text numberOfLines={numberOfLines} style={style}>
      {highlightParts.map((highlightPart, index) => {
        return (
          <Text
            key={`${highlightPart.text}:${index}`}
            style={
              highlightPart.isHighlighted
                ? [styles.highlight, highlightStyle]
                : undefined
            }
          >
            {highlightPart.text}
          </Text>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: '#f0df98',
    fontWeight: '800',
  },
});
