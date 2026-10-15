import type { SheetMusicSource } from '@org/audio-library-models';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { describeSheetMusicRow } from './model';

type SheetMusicRowProps = {
  disabled: boolean;
  onAction: (source: SheetMusicSource) => void;
  onRemove: (source: SheetMusicSource) => void;
  onRename: (source: SheetMusicSource, label: string) => void;
  source: SheetMusicSource;
};

/** One source in the manager: its label and format, `View` (or open), rename, remove. */
export const SheetMusicRow = ({
  disabled,
  onAction,
  onRemove,
  onRename,
  source,
}: SheetMusicRowProps) => {
  const [draftLabel, setDraftLabel] = useState<string | null>(null);
  const row = describeSheetMusicRow(source);

  if (draftLabel !== null) {
    return (
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={`Label for ${source.label}`}
          autoFocus
          onChangeText={setDraftLabel}
          style={styles.field}
          value={draftLabel}
        />
        <View style={styles.actions}>
          <OutlinedActionButton
            fill
            label="Cancel"
            onPress={() => {
              setDraftLabel(null);
            }}
          />
          <OutlinedActionButton
            disabled={draftLabel.trim().length === 0}
            fill
            label="Save"
            onPress={() => {
              onRename(source, draftLabel);
              setDraftLabel(null);
            }}
            variant="accent"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.summary}>
        <Text numberOfLines={2} style={styles.label}>
          {source.label}
        </Text>
        <Text style={styles.detail}>{row.detail}</Text>
        {row.hint ? <Text style={styles.detail}>{row.hint}</Text> : null}
      </View>
      <OutlinedActionButton
        label={row.actionLabel}
        onPress={() => {
          onAction(source);
        }}
        variant="accent"
      />
      <View style={styles.actions}>
        <OutlinedActionButton
          accessibilityLabel={`Rename ${source.label}`}
          disabled={disabled}
          fill
          label="Rename"
          onPress={() => {
            setDraftLabel(source.label);
          }}
        />
        <OutlinedActionButton
          accessibilityLabel={`Remove ${source.label}`}
          disabled={disabled}
          fill
          label="Remove"
          onPress={() => {
            onRemove(source);
          }}
          variant="destructive"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  detail: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  field: {
    minHeight: appTheme.space.touchTarget,
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: appTheme.space.md,
    color: appTheme.colors.text,
    fontSize: 15,
    backgroundColor: appTheme.colors.surface,
  },
  label: {
    ...appTheme.type.body,
    color: appTheme.colors.text,
    fontWeight: '600',
  },
  row: {
    gap: appTheme.space.xs,
    padding: appTheme.space.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.surface,
  },
  summary: {
    gap: 2,
  },
});
