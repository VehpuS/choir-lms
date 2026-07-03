import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../bottom-sheet-surface';
import { FeedbackCard } from '../feedback-card';
import { InteractionChip } from '../interaction-chip';
import {
  addLibraryEntityTag,
  normalizeLibraryEntityTags,
  removeLibraryEntityTag,
} from './model';

type TagEditorSheetProps = {
  isSaving: boolean;
  isVisible: boolean;
  tags: string[];
  title: string;
  onClose: () => void;
  onSave: (tags: string[]) => void;
};

const TAG_INPUT_PLACEHOLDER = 'Add tags (comma-separated)';

export const TagEditorSheet = ({
  isSaving,
  isVisible,
  tags,
  title,
  onClose,
  onSave,
}: TagEditorSheetProps) => {
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setDraftTags(normalizeLibraryEntityTags(tags));
    setTagInput('');
  }, [isVisible, tags]);

  if (!isVisible) {
    return null;
  }

  const handleAddTag = () => {
    setDraftTags((currentTags) => {
      return addLibraryEntityTag(currentTags, tagInput);
    });
    setTagInput('');
  };

  return (
    <BottomSheetSurface
      eyebrow="Tags"
      isVisible={true}
      onClose={onClose}
      title={title}
    >
      <Text style={styles.bodyCopy}>
        Add or remove tags to organize this saved library item.
      </Text>

      {draftTags.length > 0 ? (
        <View style={styles.tagRow}>
          {draftTags.map((tag) => {
            return (
              <InteractionChip
                key={tag}
                label={tag}
                style={styles.tagChip}
                variant="selected"
              >
                <Pressable
                  accessibilityLabel={`Remove ${tag} tag`}
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={() => {
                    setDraftTags((currentTags) => {
                      return removeLibraryEntityTag(currentTags, tag);
                    });
                  }}
                >
                  <Text style={styles.removeTagLabel}>×</Text>
                </Pressable>
              </InteractionChip>
            );
          })}
        </View>
      ) : (
        <FeedbackCard
          message="No tags yet. Add one to organize this item."
          size="compact"
          title="Tags"
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isSaving}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          placeholder={TAG_INPUT_PLACEHOLDER}
          placeholderTextColor={appTheme.colors.secondaryText}
          returnKeyType="done"
          style={styles.tagInput}
          value={tagInput}
        />
        <Pressable
          accessibilityLabel="Add tags"
          accessibilityRole="button"
          disabled={isSaving}
          onPress={handleAddTag}
          style={({ pressed }) => [
            styles.addTagButton,
            pressed && !isSaving ? styles.pressedAction : undefined,
            isSaving ? styles.disabledAction : undefined,
          ]}
        >
          <Text style={styles.addTagButtonLabel}>+</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onClose}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !isSaving ? styles.pressedAction : undefined,
            isSaving ? styles.disabledAction : undefined,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => {
            onSave(draftTags);
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isSaving ? styles.pressedAction : undefined,
            isSaving ? styles.disabledAction : undefined,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {isSaving ? 'Saving…' : 'Save tags'}
          </Text>
        </Pressable>
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addTagButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: '#305c4d',
  },
  addTagButtonLabel: {
    color: '#fff8ef',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  bodyCopy: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  disabledAction: {
    opacity: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressedAction: {
    opacity: 0.8,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#305c4d',
  },
  primaryButtonLabel: {
    color: '#fff8ef',
    fontSize: 13,
    fontWeight: '700',
  },
  removeTagLabel: {
    color: '#305c4d',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: appTheme.colors.cardBackground,
  },
  secondaryButtonLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  tagChip: {
    minHeight: 32,
    paddingVertical: 4,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: appTheme.colors.primaryText,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
