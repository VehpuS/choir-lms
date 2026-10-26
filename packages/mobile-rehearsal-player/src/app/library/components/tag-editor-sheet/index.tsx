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
import { dropFromMixed } from './bulk-tags';
import {
  addLibraryEntityTag,
  getActiveTagEditorInputSegment,
  parseLibraryTagInput,
  removeLibraryEntityTag,
  removeTagEditorInputActiveSegment,
  resolveTagEditorSuggestions,
} from './model';
import { TagSuggestionRow } from './tag-suggestion-row';

type TagEditorSheetProps = {
  availableTagUsage: RehearsalLibraryTagUsage[];
  isSaving: boolean;
  /** Replaces the single-item line, e.g. for a selection of several items. */
  description?: string;
  isVisible: boolean;
  /** Why the last save failed; shown above the actions. */
  issue?: { message: string; title: string } | null;
  /**
   * Tags carried by only some of the items a bulk edit covers. They sit in the
   * list marked `some`; tapping one, or adding it, gives it to every item.
   */
  mixedTags?: readonly string[];
  selectedCount?: number;
  tags: string[];
  title: string;
  onClose: () => void;
  /** The final tags, and which of them are still mixed (untouched). */
  onSave: (tags: string[], untouchedMixedTags: string[]) => void;
};

const TAG_INPUT_PLACEHOLDER = 'Add tags (comma-separated)';
const SINGLE_ITEM_DESCRIPTION =
  'Add or remove tags to organize this saved library item.';
const MIXED_TAG_SUFFIX = ' · some';
const NO_MIXED_TAGS: readonly string[] = [];

export const TagEditorSheet = ({
  availableTagUsage,
  description = SINGLE_ITEM_DESCRIPTION,
  isSaving,
  isVisible,
  issue = null,
  mixedTags = NO_MIXED_TAGS,
  selectedCount,
  tags,
  title,
  onClose,
  onSave,
}: TagEditorSheetProps) => {
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftMixedTags, setDraftMixedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setDraftTags(normalizeLibraryEntityTags([...tags, ...mixedTags]));
    setDraftMixedTags([...mixedTags]);
    setTagInput('');
  }, [isVisible, mixedTags, tags]);

  if (!isVisible) {
    return null;
  }

  // Adding a tag that was mixed gives it to every item, so it stops being mixed.
  const addTags = (value: string) => {
    setDraftTags((currentTags) => {
      return addLibraryEntityTag(currentTags, value);
    });
    setDraftMixedTags((currentMixed) => {
      return dropFromMixed(currentMixed, parseLibraryTagInput(value));
    });
  };

  const handleAddTag = () => {
    addTags(tagInput);
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
      footer={
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
              onSave(draftTags, draftMixedTags);
            }}
            variant="accent"
          />
        </View>
      }
      isVisible={true}
      onClose={onClose}
      scrollable
      title={title}
    >
      <Text style={styles.bodyCopy}>{description}</Text>

      {draftTags.length > 0 ? (
        <View style={styles.tagRow}>
          {draftTags.map((tag) => {
            const isMixed = draftMixedTags.some(
              (mixedTag) =>
                mixedTag.toLocaleLowerCase() === tag.toLocaleLowerCase(),
            );

            return (
              <InteractionChip
                accessibilityHint={
                  isMixed ? 'Adds this tag to every selected item.' : undefined
                }
                accessibilityLabel={
                  isMixed
                    ? `${tag}, on some of the ${selectedCount ?? 'selected'} items`
                    : undefined
                }
                disabled={isSaving}
                key={tag}
                label={isMixed ? `${tag}${MIXED_TAG_SUFFIX}` : tag}
                onPress={
                  isMixed
                    ? () => {
                        setDraftMixedTags((currentMixed) => {
                          return dropFromMixed(currentMixed, [tag]);
                        });
                      }
                    : undefined
                }
                variant={isMixed ? 'passive' : 'tag'}
              >
                <Pressable
                  accessibilityLabel={
                    isMixed
                      ? `Remove ${tag} tag from every selected item`
                      : `Remove ${tag} tag`
                  }
                  accessibilityRole="button"
                  {...interactionGuardProps}
                  disabled={isSaving}
                  onPress={() => {
                    setDraftTags((currentTags) => {
                      return removeLibraryEntityTag(currentTags, tag);
                    });
                    setDraftMixedTags((currentMixed) => {
                      return removeLibraryEntityTag(currentMixed, tag);
                    });
                  }}
                  style={[buttonInteractionGuardStyle, styles.removeTagTarget]}
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
          addTags(suggestion);
          setTagInput((currentInput) => {
            return removeTagEditorInputActiveSegment(currentInput);
          });
        }}
        suggestions={suggestions}
      />

      {issue ? (
        <FeedbackCard
          message={issue.message}
          size="compact"
          title={issue.title}
          tone="error"
        />
      ) : null}
    </BottomSheetSurface>
  );
};

const REMOVE_TAG_ICON_SIZE = 14;
// Pads the 14pt remove glyph out to a 44pt press target, and pulls the padding
// back with a matching negative margin so the chip keeps its size. (`hitSlop`
// would not do: react-native-web ignores it.)
const REMOVE_TAG_TARGET_PADDING = 15;

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
  removeTagTarget: {
    margin: -REMOVE_TAG_TARGET_PADDING,
    padding: REMOVE_TAG_TARGET_PADDING,
  },
  tagInput: {
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.space.xs,
  },
});
