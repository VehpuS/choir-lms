import {
  planMarkerSections,
  type MarkerSection,
  type TrackMarker,
} from '@org/audio-library-models';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { ariaStateProps } from '../../../../components/aria-state';
import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';
import { CenteredDialogCard } from '../../../components/centered-dialog-card';
import {
  CREATE_LOOPS_TITLE,
  INCLUDE_INTRO_LABEL,
  buildCreateLoopsModel,
  resolveSectionsToCreate,
  toggleSection,
  type SectionOverrides,
} from './model';

const CHECK_ICON_SIZE = 22;
const LIST_MAX_HEIGHT = 280;
const SAVE_FAILED_MESSAGE = 'Some loops could not be saved.';

type CreateLoopsDialogProps = {
  durationMs?: number;
  /** Loops the track already has, so duplicates are shown and skipped. */
  existingLoops: readonly { endMs: number; name: string; startMs: number }[];
  explicitMarkers: readonly TrackMarker[];
  onCancel: () => void;
  /** Saves the sections as loops; resolves true when every one was saved. */
  onCreate: (sections: MarkerSection[]) => Promise<boolean>;
};

const CheckRow = ({
  children,
  isChecked,
  isDisabled = false,
  label,
  onPress,
}: {
  children: React.ReactNode;
  isChecked: boolean;
  isDisabled?: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: isChecked, disabled: isDisabled }}
    {...ariaStateProps(
      { checked: isChecked, disabled: isDisabled },
      'checkbox',
    )}
    {...interactionGuardProps}
    disabled={isDisabled}
    onPress={onPress}
    style={[
      styles.row,
      buttonInteractionGuardStyle,
      isDisabled ? styles.dimmed : null,
    ]}
  >
    <AppIcon
      color={isChecked ? appTheme.colors.accent : appTheme.colors.textMuted}
      name={isChecked ? 'check-circle' : 'circle-outline'}
      size={CHECK_ICON_SIZE}
    />
    {children}
  </Pressable>
);

/**
 * `Create loops from markers` (design Decision 7): sections between the
 * user's own markers, each named after its start marker, as checkboxes. Loop
 * boundaries are never section boundaries because only explicit markers are
 * passed in.
 */
export const CreateLoopsDialog = ({
  durationMs,
  existingLoops,
  explicitMarkers,
  onCancel,
  onCreate,
}: CreateLoopsDialogProps) => {
  const [includeIntro, setIncludeIntro] = useState(false);
  const [overrides, setOverrides] = useState<SectionOverrides>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = useMemo(
    () =>
      planMarkerSections(explicitMarkers, durationMs, existingLoops, {
        includeIntro,
      }),
    [durationMs, existingLoops, explicitMarkers, includeIntro],
  );
  const model = buildCreateLoopsModel(plan, overrides);
  // An intro only exists before a first marker that is not at the very start.
  const hasIntroRoom = (explicitMarkers[0]?.positionMs ?? 0) > 0;

  const create = async () => {
    setIsSaving(true);
    setError(null);

    const didSaveAll = await onCreate(resolveSectionsToCreate(plan, overrides));

    setIsSaving(false);

    if (!didSaveAll) {
      setError(SAVE_FAILED_MESSAGE);
    }
  };

  return (
    <CenteredDialogCard isVisible onRequestClose={onCancel}>
      <Text style={styles.title}>{CREATE_LOOPS_TITLE}</Text>
      {hasIntroRoom ? (
        <CheckRow
          isChecked={includeIntro}
          label={INCLUDE_INTRO_LABEL}
          onPress={() => {
            setIncludeIntro(!includeIntro);
          }}
        >
          <Text style={styles.name}>{INCLUDE_INTRO_LABEL}</Text>
        </CheckRow>
      ) : null}
      {model.emptyMessage ? (
        <Text style={styles.note}>{model.emptyMessage}</Text>
      ) : (
        <ScrollView style={[darkScrollbarStyle, styles.list]}>
          {plan.sections.map((section, index) => {
            const row = model.rows[index];

            return row ? (
              <CheckRow
                isChecked={row.isChecked}
                isDisabled={!row.canCheck}
                key={row.key}
                label={`${row.name}, ${row.rangeLabel}`}
                onPress={() => {
                  setOverrides(toggleSection(overrides, section));
                }}
              >
                <View style={styles.copy}>
                  <Text numberOfLines={1} style={styles.name}>
                    {row.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.note}>
                    {row.skipLabel ?? row.rangeLabel}
                  </Text>
                </View>
              </CheckRow>
            ) : null;
          })}
        </ScrollView>
      )}
      {model.note ? <Text style={styles.note}>{model.note}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <OutlinedActionButton
          disabled={isSaving}
          fill
          label="Cancel"
          onPress={onCancel}
        />
        <OutlinedActionButton
          disabled={!model.canConfirm || isSaving}
          fill
          isBusy={isSaving}
          label={model.confirmLabel}
          onPress={() => {
            void create();
          }}
          variant="accent"
        />
      </View>
    </CenteredDialogCard>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  dimmed: {
    opacity: 0.56,
  },
  error: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.danger,
  },
  list: {
    flexGrow: 0,
    maxHeight: LIST_MAX_HEIGHT,
  },
  name: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  note: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  row: {
    minHeight: appTheme.space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  title: {
    ...appTheme.type.sheetTitle,
    color: appTheme.colors.text,
  },
});
