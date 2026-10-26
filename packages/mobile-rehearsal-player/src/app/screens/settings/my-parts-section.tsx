import {
  addPartPreferenceLast,
  normalizePartName,
  removePartPreference,
} from '@org/audio-library-models';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { OutlinedActionButton } from '../../components/outlined-action-button';
import { ReorderableList } from '../../components/reorderable-list';
import { InteractionChip } from '../../library/components/interaction-chip';
import {
  updateMyPartsPreferences,
  useMyPartsPreferences,
} from '../../library/sheet-music/my-parts/my-parts-store';
import { appTheme } from '../../utils/theme';
import { MY_PARTS_COPY, buildPartPresetChips } from './model';

const REMOVE_ICON_SIZE = 16;

/**
 * Settings for the singer's ordered part list: reorder by dragging or with the
 * arrows, remove, and add a preset or any name of their own.
 */
export const MyPartsSection = () => {
  const { parts } = useMyPartsPreferences();
  const [isNaming, setIsNaming] = useState(false);
  const [draft, setDraft] = useState('');

  const addPart = (name: string) => {
    updateMyPartsPreferences({ parts: addPartPreferenceLast(parts, name) });
  };
  const submitDraft = () => {
    addPart(draft);
    setDraft('');
    setIsNaming(false);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.body}>{MY_PARTS_COPY.body}</Text>
      <Text style={styles.addHeading}>{MY_PARTS_COPY.addHeading}</Text>
      <View style={styles.chips}>
        {buildPartPresetChips(parts).map((name) => (
          <InteractionChip
            accessibilityLabel={`Add ${name}`}
            key={name}
            label={name}
            onPress={() => addPart(name)}
            variant="passive"
          />
        ))}
        <InteractionChip
          accessibilityLabel={MY_PARTS_COPY.customLabel}
          accessibilitySelected={isNaming}
          label={MY_PARTS_COPY.customLabel}
          onPress={() => setIsNaming((current) => !current)}
          variant={isNaming ? 'selected' : 'passive'}
        />
      </View>
      {isNaming ? (
        <View style={styles.draftRow}>
          <TextInput
            accessibilityLabel={MY_PARTS_COPY.addLabel}
            autoCorrect={false}
            maxLength={40}
            onChangeText={setDraft}
            onSubmitEditing={submitDraft}
            placeholder={MY_PARTS_COPY.addPlaceholder}
            placeholderTextColor={appTheme.colors.textFaint}
            style={styles.field}
            value={draft}
          />
          <OutlinedActionButton
            disabled={draft.trim().length === 0}
            label={MY_PARTS_COPY.saveLabel}
            onPress={submitDraft}
          />
        </View>
      ) : null}
      {parts.length === 0 ? (
        <Text style={styles.empty}>{MY_PARTS_COPY.emptyLabel}</Text>
      ) : (
        <ReorderableList
          getKey={normalizePartName}
          getLabel={(name) => name}
          items={parts}
          onReorder={(next) => updateMyPartsPreferences({ parts: next })}
          renderItem={(name, { controls, index, itemCount }) => (
            <View
              style={[
                styles.partRow,
                index < itemCount - 1 ? styles.partRowSeparated : undefined,
              ]}
            >
              <Text style={styles.name}>{name}</Text>
              {controls}
              <Pressable
                accessibilityLabel={`Remove ${name}`}
                accessibilityRole="button"
                onPress={() =>
                  updateMyPartsPreferences({
                    parts: removePartPreference(parts, name),
                  })
                }
                style={styles.remove}
              >
                <AppIcon
                  color={appTheme.colors.textMuted}
                  name="close"
                  size={REMOVE_ICON_SIZE}
                />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  addHeading: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    marginTop: appTheme.space.xs,
  },
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.space.xs,
  },
  draftRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.sm,
  },
  empty: {
    color: appTheme.colors.text,
    fontSize: 15,
  },
  field: {
    backgroundColor: appTheme.colors.surface,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    color: appTheme.colors.text,
    flex: 1,
    fontSize: appTheme.type.input.fontSize,
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: appTheme.space.md,
  },
  name: {
    color: appTheme.colors.text,
    flex: 1,
    fontSize: 15,
    minWidth: 0,
  },
  partRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.sm,
    paddingVertical: appTheme.space.xs,
  },
  partRowSeparated: {
    borderBottomColor: appTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  remove: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  section: {
    gap: appTheme.space.xs,
  },
});
