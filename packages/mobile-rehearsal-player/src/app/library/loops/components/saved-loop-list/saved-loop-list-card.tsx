import type { PlayableItem } from '@org/audio-library-models';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../../components/compact-playback-action';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { PlaybackWaveform } from '../../../../components/playback-waveform';
import { getPlaybackProgressRatio } from '../../../../routing/shell/shell-playback-summary-model';
import { appTheme } from '../../../../utils/theme';
import { useSavedTrackPlayerProgress } from '../../../playback/utils/saved-track-player-interop';
import { SearchHighlightedText } from '../../../search/components/search-highlighted-text';
import type {
  SavedLoopCardFooter,
  SavedLoopCardPresentation,
} from './saved-loop-list-card-model';

type SavedLoopListCardProps = {
  disabled: boolean;
  highlightQuery: string | null;
  message: string | undefined;
  onTogglePlayback: () => void;
  overflowTrigger: ReactNode;
  parentTrackName: string;
  playableItem: PlayableItem | null;
  presentation: SavedLoopCardPresentation;
  ringDisabled: boolean;
  title: string;
};

const { colors } = appTheme;
const PROGRESS_UPDATE_INTERVAL_MS = 500;

// The active loop's excerpt tracks live progress through its own player
// subscription, so only this card re-renders on each progress tick.
const SavedLoopCardExcerpt = ({
  footer,
  playableItem,
}: {
  footer: SavedLoopCardFooter;
  playableItem: PlayableItem;
}) => {
  const progress = useSavedTrackPlayerProgress(PROGRESS_UPDATE_INTERVAL_MS);

  return (
    <View style={styles.excerpt}>
      <PlaybackWaveform
        activePlayableItem={playableItem}
        progressRatio={getPlaybackProgressRatio({
          activePlayableItem: playableItem,
          playbackPositionSeconds: progress.position,
        })}
        variant="excerpt"
      />
      <View style={styles.footer}>
        <Text style={styles.footerEdge}>{footer.startLabel}</Text>
        <Text style={styles.footerLength}>{footer.lengthLabel}</Text>
        <Text style={[styles.footerEdge, styles.footerEnd]}>
          {footer.endLabel}
        </Text>
      </View>
    </View>
  );
};

// Loop card from screen 1d: an outlined card per loop whose body plays or
// pauses it; the active loop fills, gains an accent edge, and expands.
export const SavedLoopListCard = ({
  disabled,
  highlightQuery,
  message,
  onTogglePlayback,
  overflowTrigger,
  parentTrackName,
  playableItem,
  presentation,
  ringDisabled,
  title,
}: SavedLoopListCardProps) => {
  const isActive = presentation.tone === 'active';

  return (
    <View
      style={[
        styles.card,
        isActive ? styles.cardActive : undefined,
        disabled ? styles.cardDisabled : undefined,
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          {...interactionGuardProps}
          disabled={disabled}
          onPress={onTogglePlayback}
          style={({ pressed }) => [
            styles.body,
            buttonInteractionGuardStyle,
            pressed && !disabled ? styles.pressed : undefined,
          ]}
        >
          <SearchHighlightedText
            numberOfLines={1}
            query={highlightQuery}
            style={[styles.title, isActive ? styles.titleActive : undefined]}
            text={title}
          />
          {/* Range first so it survives truncation of a long parent name. */}
          <Text numberOfLines={1} style={styles.meta}>
            <Text style={styles.timecode}>{presentation.rangeLabel}</Text>
            {presentation.transformLabel
              ? ` · ${presentation.transformLabel}`
              : null}
            {' · '}
            <SearchHighlightedText
              query={highlightQuery}
              style={styles.meta}
              text={parentTrackName}
            />
          </Text>
        </Pressable>
        {isActive ? null : (
          <Text style={styles.length}>{presentation.lengthLabel}</Text>
        )}
        <CompactPlaybackAction
          accessibilityLabel={presentation.ringAccessibilityLabel}
          disabled={ringDisabled}
          iconName={presentation.ringIconName}
          onPress={onTogglePlayback}
          selected={isActive}
          variant="row"
        />
        {overflowTrigger}
      </View>
      {message ? (
        <Text numberOfLines={2} style={styles.message}>
          {message}
        </Text>
      ) : null}
      {presentation.footer && playableItem ? (
        <SavedLoopCardExcerpt
          footer={presentation.footer}
          playableItem={playableItem}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: appTheme.space.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.borderTile,
    borderRadius: appTheme.radius.md,
  },
  // The active loop is marked by fill, edge, and title color, never accent.
  cardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    ...appTheme.type.rowTitle,
    color: colors.text,
  },
  titleActive: {
    color: colors.accentText,
  },
  meta: {
    ...appTheme.type.rowMeta,
    lineHeight: 17,
  },
  timecode: {
    fontFamily: appTheme.fontFamily.mono,
    fontSize: 11.5,
  },
  length: {
    ...appTheme.type.timecode,
    fontSize: 12,
  },
  message: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  excerpt: {
    gap: appTheme.space.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerEdge: {
    ...appTheme.type.timecode,
    flex: 1,
  },
  footerEnd: {
    textAlign: 'right',
  },
  footerLength: {
    ...appTheme.type.timecode,
    color: colors.text,
  },
});
