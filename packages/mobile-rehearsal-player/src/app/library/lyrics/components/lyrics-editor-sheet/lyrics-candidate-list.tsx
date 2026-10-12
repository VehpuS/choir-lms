import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { appTheme } from '../../../../utils/theme';
import type { LyricsCandidate } from '../../lyrics-lookup-client';
import { formatCandidateLengthDifference } from './model';

type LyricsCandidateListProps = {
  candidates: LyricsCandidate[];
  onChoose: (candidate: LyricsCandidate) => void;
  trackDurationMs?: number;
};

export const LyricsCandidateList = ({
  candidates,
  onChoose,
  trackDurationMs,
}: LyricsCandidateListProps) => {
  return (
    <View style={styles.list}>
      {candidates.map((candidate, index) => {
        const difference = formatCandidateLengthDifference(
          candidate.durationMs,
          trackDurationMs,
        );
        const detail = [candidate.artist, difference]
          .filter((part): part is string => !!part)
          .join(' · ');

        return (
          <Pressable
            accessibilityHint="Loads these lyrics into the editor without saving."
            accessibilityLabel={`${candidate.title}${detail ? `, ${detail}` : ''}`}
            accessibilityRole="button"
            {...interactionGuardProps}
            key={`${candidate.title}:${candidate.artist}:${index}`}
            onPress={() => {
              onChoose(candidate);
            }}
            style={({ pressed }) => [
              styles.row,
              buttonInteractionGuardStyle,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <Text numberOfLines={1} style={styles.title}>
              {candidate.title}
            </Text>
            {detail ? (
              <Text numberOfLines={1} style={styles.detail}>
                {detail}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  detail: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
  },
  list: {
    gap: appTheme.space.xs,
  },
  pressed: {
    opacity: 0.8,
  },
  row: {
    minHeight: appTheme.space.touchTarget,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: appTheme.space.md,
    paddingVertical: appTheme.space.xs,
    backgroundColor: appTheme.colors.surface,
  },
  title: {
    ...appTheme.type.body,
    color: appTheme.colors.text,
  },
});
