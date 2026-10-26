import type { ScoreBars, ScorePart } from '@org/audio-library-models';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';
import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { appTheme } from '../../../../utils/theme';
import {
  GO_TO_BAR_LABEL,
  GO_TO_MARKS_TITLE,
  GO_TO_PARTS_TITLE,
  GO_TO_TITLE,
  buildGoToMarkRows,
  buildGoToPartRows,
  resolveBarInput,
} from './go-to-model';

type GoToDrawerProps = {
  bars: ScoreBars;
  onClose: () => void;
  onJump: (barIndex: number) => void;
  /** The parts being shown, in the order their staves are drawn. */
  visibleParts: readonly ScorePart[];
};

/**
 * A drawer over the left of the score: a bar number to go to, the rehearsal
 * marks as a tap-to-jump list, and the part names in staff order. It takes no
 * room while the singer reads and closes itself on a jump.
 */
export const GoToDrawer = ({
  bars,
  onClose,
  onJump,
  visibleParts,
}: GoToDrawerProps) => {
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const markRows = buildGoToMarkRows(bars.rehearsalMarks, bars.barLabels);
  const partRows = buildGoToPartRows(visibleParts);

  const submit = () => {
    const result = resolveBarInput(draft, bars.barLabels);

    if (result.status === 'ok') {
      onJump(result.barIndex);
      return;
    }

    setMessage(result.message);
  };

  return (
    <View style={styles.layer}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>{GO_TO_TITLE}</Text>
          <SurfaceIconButton
            accessibilityLabel="Close go to"
            icon="close"
            onPress={onClose}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={darkScrollbarStyle}
        >
          <Text style={styles.sectionTitle}>{GO_TO_BAR_LABEL}</Text>
          <View style={styles.barRow}>
            <TextInput
              accessibilityLabel="Bar number"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(text) => {
                setDraft(text);
                setMessage(null);
              }}
              onSubmitEditing={submit}
              placeholder={`1 to ${bars.barLabels[bars.barCount - 1] ?? bars.barCount}`}
              placeholderTextColor={appTheme.colors.textFaint}
              returnKeyType="go"
              style={styles.field}
              value={draft}
            />
            <OutlinedActionButton
              label="Go"
              onPress={submit}
              variant="accent"
            />
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {markRows.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>{GO_TO_MARKS_TITLE}</Text>
              {markRows.map((row) => (
                <Pressable
                  accessibilityLabel={`Go to ${row.label}, ${row.detail}`}
                  accessibilityRole="button"
                  key={row.key}
                  onPress={() => {
                    onJump(row.barIndex);
                  }}
                  style={styles.markRow}
                >
                  <Text numberOfLines={1} style={styles.markLabel}>
                    {row.label}
                  </Text>
                  <Text style={styles.detail}>{row.detail}</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          {partRows.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>{GO_TO_PARTS_TITLE}</Text>
              {partRows.map((row) => (
                <View key={row.key} style={styles.partRow}>
                  <Text style={styles.detail}>{row.position}</Text>
                  <Text numberOfLines={1} style={styles.partName}>
                    {row.name}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </View>
      <Pressable
        accessibilityLabel="Close go to"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: appTheme.colors.scrim,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
  content: {
    gap: appTheme.space.sm,
    paddingBottom: appTheme.space.md,
  },
  detail: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  field: {
    flex: 1,
    minHeight: appTheme.space.touchTarget,
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: appTheme.space.md,
    color: appTheme.colors.text,
    fontSize: appTheme.type.input.fontSize,
    backgroundColor: appTheme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  markLabel: {
    ...appTheme.type.rowTitle,
    flex: 1,
    color: appTheme.colors.text,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
    minHeight: appTheme.space.touchTarget,
  },
  message: {
    ...appTheme.type.body,
    color: appTheme.colors.warning,
  },
  panel: {
    width: '85%',
    maxWidth: 320,
    gap: appTheme.space.sm,
    padding: appTheme.space.md,
    backgroundColor: appTheme.colors.surfaceRaised,
  },
  partName: {
    ...appTheme.type.body,
    flex: 1,
    color: appTheme.colors.text,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  sectionTitle: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
    textTransform: 'uppercase',
  },
  title: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
});
