import { normalizeLibraryEntityTags } from '@org/audio-library-models';
import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../bottom-sheet-surface';
import { FeedbackCard } from '../feedback-card';
import { InteractionChip } from '../interaction-chip';
import {
  addLibraryEntityTag,
  getActiveTagEditorInputSegment,
  removeLibraryEntityTag,
  removeTagEditorInputActiveSegment,
  resolveTagEditorSuggestions,
} from './model';
import { TagSuggestionRow } from './tag-suggestion-row';

type TagEditorSheetProps = {
  availableTagUsage: RehearsalLibraryTagUsage[];
  isSaving: boolean;
  isVisible: boolean;
  tags: string[];
  title: string;
  onClose: () => void;
  onSave: (tags: string[]) => void;
};

const TAG_INPUT_PLACEHOLDER = 'Add tags (comma-separated)';

export const TagEditorSheet = ({
  availableTagUsage,
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

  const activeSegment = getActiveTagEditorInputSegment(tagInput);
  const suggestions = resolveTagEditorSuggestions(
    availableTagUsage,
    draftTags,
    activeSegment,
  );

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
              <InteractionChip key={tag} label={tag} variant="tag">
                <Pressable
                  accessibilityLabel={`Remove ${tag} tag`}
                  accessibilityRole="button"
                  {...interactionGuardProps}
                  disabled={isSaving}
                  hitSlop={REMOVE_TAG_HIT_SLOP}
                  onPress={() => {
                    setDraftTags((currentTags) => {
                      return removeLibraryEntityTag(currentTags, tag);
                    });
                  }}
                  style={buttonInteractionGuardStyle}
                >
                  <AppIcon
                    color={appTheme.colors.accentOnTint}
                    name="close"
                    size={REMOVE_TAG_ICON_SIZE}
                  />
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
          placeholderTextColor={appTheme.colors.textFaint}
          returnKeyType="done"
          style={styles.tagInput}
          value={tagInput}
        />
        <Pressable
          accessibilityLabel="Add tags"
          accessibilityRole="button"
          {...interactionGuardProps}
          disabled={isSaving}
          onPress={handleAddTag}
          style={({ pressed }) => [
            styles.addTagButton,
            buttonInteractionGuardStyle,
            pressed && !isSaving ? styles.pressedAction : undefined,
            isSaving ? styles.disabledAction : undefined,
          ]}
        >
          <AppIcon color={appTheme.colors.accentText} name="plus" size={20} />
        </Pressable>
      </View>

      <TagSuggestionRow
        isSaving={isSaving}
        onSelectSuggestion={(suggestion) => {
          setDraftTags((currentTags) => {
            return addLibraryEntityTag(currentTags, suggestion);
          });
          setTagInput((currentInput) => {
            return removeTagEditorInputActiveSegment(currentInput);
          });
        }}
        suggestions={suggestions}
      />

      <View style={styles.actionRow}>
        <OutlinedActionButton
          disabled={isSaving}
          fill
          label="Cancel"
          onPress={onClose}
        />
        <OutlinedActionButton
          disabled={isSaving}
          fill
          label={isSaving ? 'Saving…' : 'Save tags'}
          onPress={() => {
            onSave(draftTags);
          }}
          variant="accent"
        />
      </View>
    </BottomSheetSurface>
  );
};

const REMOVE_TAG_ICON_SIZE = 14;
// Pads the 14pt remove glyph out to a 44pt hit area inside the chip.
const REMOVE_TAG_HIT_SLOP = 15;

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  addTagButton: {
    width: appTheme.space.touchTarget,
    height: appTheme.space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.accent,
    borderRadius: appTheme.radius.md,
  },
  bodyCopy: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  disabledAction: {
    opacity: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
  pressedAction: {
    opacity: 0.8,
  },
  tagInput: {
    flex: 1,
    minHeight: appTheme.space.touchTarget,
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: appTheme.space.md,
    color: appTheme.colors.text,
    fontSize: 15,
    backgroundColor: appTheme.colors.surface,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.space.xs,
  },
});
