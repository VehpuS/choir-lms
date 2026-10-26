import {
  addSearchSource,
  createCustomSearchSource,
  findSearchTemplateProblem,
  removeSearchSource,
  unusedBuiltInSearchSources,
  type SearchSourceKind,
} from '@org/audio-library-models';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { OutlinedActionButton } from '../../components/outlined-action-button';
import { ReorderableList } from '../../components/reorderable-list';
import { InteractionChip } from '../../library/components/interaction-chip';
import {
  resetSearchSources,
  updateSearchSources,
  useSearchSources,
} from '../../library/search-sources/search-sources-store';
import { appTheme } from '../../utils/theme';
import {
  SEARCH_SOURCES_COPY,
  SEARCH_SOURCE_FORM_COPY,
  SEARCH_TEMPLATE_PROBLEM_MESSAGES,
  describeSearchSourceHost,
} from './model';

const REMOVE_ICON_SIZE = 16;
const NAME_MAX_LENGTH = 30;
const TEMPLATE_MAX_LENGTH = 300;

/**
 * Settings for one ordered list of search sources: reorder by dragging or with
 * the arrows (the first is the default), remove, add a built-in back, or add
 * a custom address.
 */
export const SearchSourcesSection = ({ kind }: { kind: SearchSourceKind }) => {
  const sources = useSearchSources(kind);
  const copy = SEARCH_SOURCES_COPY[kind];
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const submitCustom = () => {
    const problem = findSearchTemplateProblem(template);

    if (problem) {
      setMessage(SEARCH_TEMPLATE_PROBLEM_MESSAGES[problem]);
      return;
    }

    const created = createCustomSearchSource(sources, name, template);

    if (!created) {
      setMessage('Give the source a name.');
      return;
    }

    updateSearchSources(kind, addSearchSource(sources, created));
    setName('');
    setTemplate('');
    setMessage(null);
    setIsNaming(false);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <ReorderableList
        getKey={(source) => source.id}
        getLabel={(source) => source.label}
        items={sources}
        onReorder={(next) => updateSearchSources(kind, next)}
        renderItem={(source, { controls, index, itemCount }) => (
          <View
            style={[
              styles.row,
              index < itemCount - 1 ? styles.rowSeparated : undefined,
            ]}
          >
            <View style={styles.name}>
              <Text style={styles.label}>{source.label}</Text>
              <Text numberOfLines={1} style={styles.host}>
                {describeSearchSourceHost(source.urlTemplate)}
              </Text>
            </View>
            {controls}
            <Pressable
              accessibilityLabel={`Remove ${source.label}`}
              accessibilityRole="button"
              disabled={sources.length <= 1}
              onPress={() =>
                updateSearchSources(
                  kind,
                  removeSearchSource(sources, source.id),
                )
              }
              style={[
                styles.remove,
                sources.length <= 1 ? styles.removeDisabled : undefined,
              ]}
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
      <Text style={styles.addHeading}>{SEARCH_SOURCE_FORM_COPY.addLabel}</Text>
      <View style={styles.chips}>
        {unusedBuiltInSearchSources(kind, sources).map((source) => (
          <InteractionChip
            accessibilityLabel={`Add ${source.label}`}
            key={source.id}
            label={source.label}
            onPress={() =>
              updateSearchSources(kind, addSearchSource(sources, source))
            }
            variant="passive"
          />
        ))}
        <InteractionChip
          accessibilityLabel={`${SEARCH_SOURCE_FORM_COPY.customLabel} ${copy.title}`}
          accessibilitySelected={isNaming}
          label={SEARCH_SOURCE_FORM_COPY.customLabel}
          onPress={() => setIsNaming((current) => !current)}
          variant={isNaming ? 'selected' : 'passive'}
        />
      </View>
      {isNaming ? (
        <View style={styles.form}>
          <TextInput
            accessibilityLabel={`${copy.title} name`}
            autoCorrect={false}
            maxLength={NAME_MAX_LENGTH}
            onChangeText={(text) => {
              setName(text);
              setMessage(null);
            }}
            placeholder={SEARCH_SOURCE_FORM_COPY.labelPlaceholder}
            placeholderTextColor={appTheme.colors.textFaint}
            style={styles.field}
            value={name}
          />
          <TextInput
            accessibilityLabel={`${copy.title} address`}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={TEMPLATE_MAX_LENGTH}
            onChangeText={(text) => {
              setTemplate(text);
              setMessage(null);
            }}
            onSubmitEditing={submitCustom}
            placeholder={SEARCH_SOURCE_FORM_COPY.templatePlaceholder}
            placeholderTextColor={appTheme.colors.textFaint}
            style={styles.field}
            value={template}
          />
          <Text style={styles.body}>{SEARCH_SOURCE_FORM_COPY.hint}</Text>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <OutlinedActionButton
            accessibilityLabel={`Add to ${copy.title}`}
            disabled={name.trim().length === 0 || template.trim().length === 0}
            label={SEARCH_SOURCE_FORM_COPY.saveLabel}
            onPress={submitCustom}
          />
        </View>
      ) : null}
      <OutlinedActionButton
        label={SEARCH_SOURCE_FORM_COPY.resetLabel}
        onPress={() => resetSearchSources(kind)}
        variant="neutral"
      />
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
  error: {
    color: appTheme.colors.danger,
    fontSize: 13,
  },
  field: {
    backgroundColor: appTheme.colors.surface,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    color: appTheme.colors.text,
    fontSize: appTheme.type.input.fontSize,
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: appTheme.space.md,
  },
  form: {
    gap: appTheme.space.xs,
  },
  host: {
    color: appTheme.colors.textMuted,
    fontSize: 12,
  },
  label: {
    color: appTheme.colors.text,
    fontSize: 15,
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  remove: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  removeDisabled: {
    opacity: 0.4,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.sm,
    paddingVertical: appTheme.space.xs,
  },
  rowSeparated: {
    borderBottomColor: appTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  section: {
    gap: appTheme.space.xs,
  },
  title: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
});
