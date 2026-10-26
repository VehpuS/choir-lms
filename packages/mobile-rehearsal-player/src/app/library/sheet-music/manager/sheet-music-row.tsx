import type { SheetMusicSource } from '@org/audio-library-models';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { appTheme } from '../../../utils/theme';
import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import { describeSheetMusicRow } from './model';

type SheetMusicRowProps = {
  disabled: boolean;
  onAction: (source: SheetMusicSource) => void;
  onRemove: (source: SheetMusicSource) => void;
  onRename: (source: SheetMusicSource, label: string) => void;
  /** Offered for a link, where the browser may not let the app read the file. */
  onSaveToDrive?: (source: SheetMusicSource) => void;
  source: SheetMusicSource;
};

/** One source in the manager: its label and format, `View` (or open), rename, remove. */
export const SheetMusicRow = ({
  disabled,
  onAction,
  onRemove,
  onRename,
  onSaveToDrive,
  source,
}: SheetMusicRowProps) => {
  const [draftLabel, setDraftLabel] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <View style={styles.row}>
      <View style={styles.main}>
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
        <OverflowMenuTrigger
          accessibilityLabel={`${source.label} options`}
          disabled={disabled}
          onPress={() => {
            setIsMenuOpen(true);
          }}
          style={styles.overflowTrigger}
        />
      </View>
      <OptionsMenuSheet
        actions={[
          ...(onSaveToDrive && source.location.kind === 'url'
            ? [
                {
                  id: 'save-to-drive',
                  label: 'Save to Drive',
                  onPress: () => {
                    closeMenu();
                    onSaveToDrive(source);
                  },
                },
              ]
            : []),
          {
            id: 'rename',
            label: 'Rename',
            onPress: () => {
              closeMenu();
              setDraftLabel(source.label);
            },
          },
          {
            id: 'remove',
            label: 'Remove',
            onPress: () => {
              closeMenu();
              onRemove(source);
            },
            tone: 'destructive',
          },
        ]}
        isVisible={isMenuOpen}
        onClose={closeMenu}
        title={source.label}
      />
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
    fontSize: appTheme.type.input.fontSize,
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
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
  // The shared trigger is absolutely placed by default; here it sits in the row.
  overflowTrigger: {
    position: 'relative',
    right: 0,
    top: 0,
  },
  summary: {
    flex: 1,
    gap: 2,
  },
});
