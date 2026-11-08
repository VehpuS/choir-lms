import type { CompositeDraft } from '@org/audio-library-models';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  NO_ROOM_MESSAGE,
  NO_ROOM_SUGGESTIONS,
} from '../prepared/composite-room';
import {
  buildCompositeDraft,
  CREATE_SHEET_COPY,
  MAX_COMPOSITE_NAME_LENGTH,
  MAX_STEM_NAME_LENGTH,
  resolveCreateSheetModel,
  type CreateSheetTrack,
} from './create-sheet-model';
import { useCompositeStorageFit } from './use-composite-storage-fit';

const { colors, space, radius, type } = appTheme;

export const COMPOSITE_NAME_FIELD_LABEL = 'Composite name';
export const getStemNameFieldLabel = (trackName: string) =>
  `Stem name for ${trackName}`;

type CompositeCreateSheetProps = {
  tracks: readonly CreateSheetTrack[];
  unreadableTrackIds?: readonly string[];
  onCancel: () => void;
  onCreate: (draft: CompositeDraft) => void;
  /** Opens the existing `Clear all` confirmation; the button is left out without it (task 9.2). */
  onClearOfflineFiles?: () => void;
};

type NoteTone = 'info' | 'warning' | 'problem';

const Note = ({ children, tone }: { children: string; tone: NoteTone }) => (
  <View style={[styles.note, noteStyles[tone]]}>
    <Text style={styles.noteText}>{children}</Text>
  </View>
);

/**
 * The sheet that makes a composite from the selected tracks (design Decisions
 * 2, 3 and 9): a name, the stems with editable names, and the notes the model
 * decides on. `Create` waits for unknown lengths and stays unavailable when
 * there is no room to prepare the stems.
 */
export const CompositeCreateSheet = ({
  tracks,
  unreadableTrackIds,
  onCancel,
  onClearOfflineFiles,
  onCreate,
}: CompositeCreateSheetProps) => {
  const [compositeName, setCompositeName] = useState<string | null>(null);
  const [stemNames, setStemNames] = useState<Record<string, string>>({});
  const fit = useCompositeStorageFit(tracks);
  const input = { tracks, compositeName, stemNames, fit, unreadableTrackIds };
  const model = resolveCreateSheetModel(input);
  const { room } = model;

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          {room.kind === 'no-room' && onClearOfflineFiles ? (
            <MenuRow
              label={CREATE_SHEET_COPY.clearOfflineLabel}
              onPress={onClearOfflineFiles}
            />
          ) : null}
          <MenuRow
            disabled={!model.canCreate}
            label={CREATE_SHEET_COPY.createLabel}
            onPress={() => onCreate(buildCompositeDraft(input))}
            tone="preferred"
          />
          <MenuRow label={CREATE_SHEET_COPY.cancelLabel} onPress={onCancel} />
        </MenuGroup>
      }
      isVisible={true}
      onClose={onCancel}
      scrollable={true}
      title={CREATE_SHEET_COPY.title}
    >
      <View style={styles.body}>
        <Text style={styles.detail}>{CREATE_SHEET_COPY.subtitle}</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{CREATE_SHEET_COPY.nameLabel}</Text>
          <TextInput
            accessibilityLabel={COMPOSITE_NAME_FIELD_LABEL}
            autoCorrect={false}
            maxLength={MAX_COMPOSITE_NAME_LENGTH}
            onChangeText={setCompositeName}
            selectTextOnFocus
            style={styles.input}
            value={model.compositeName}
          />
        </View>
        <View style={styles.columns}>
          <Text style={styles.fieldLabel}>{CREATE_SHEET_COPY.trackColumn}</Text>
          <Text style={styles.fieldLabel}>{CREATE_SHEET_COPY.stemColumn}</Text>
        </View>
        {model.rows.map((row) => (
          <View key={row.trackId} style={styles.stemRow}>
            <View style={styles.trackText}>
              <Text numberOfLines={1} style={styles.trackName}>
                {row.trackName}
              </Text>
              {row.meta ? <Text style={styles.detail}>{row.meta}</Text> : null}
            </View>
            <TextInput
              accessibilityLabel={getStemNameFieldLabel(row.trackName)}
              autoCorrect={false}
              maxLength={MAX_STEM_NAME_LENGTH}
              onChangeText={(typed) =>
                setStemNames((names) => ({ ...names, [row.trackId]: typed }))
              }
              selectTextOnFocus
              style={[styles.input, styles.stemInput]}
              value={row.stemName}
            />
          </View>
        ))}
        {model.lengthWarning ? (
          <Note tone="warning">{model.lengthWarning}</Note>
        ) : null}
        {model.waitingNote ? (
          <Note tone="info">{model.waitingNote}</Note>
        ) : null}
        {model.unreadableNote ? (
          <Note tone="problem">{model.unreadableNote}</Note>
        ) : null}
        <Note tone="info">{model.firstPlayNote}</Note>
        {room.kind === 'no-room' ? (
          <Note tone="problem">{`${NO_ROOM_MESSAGE} ${NO_ROOM_SUGGESTIONS.join(' ')}`}</Note>
        ) : null}
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  body: { gap: space.sm },
  columns: { flexDirection: 'row', justifyContent: 'space-between' },
  detail: { ...type.rowMeta, color: colors.textMuted },
  field: { gap: space.xxs },
  fieldLabel: { ...type.rowMeta, color: colors.textMuted },
  input: {
    minHeight: space.touchTarget,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: type.input.fontSize,
    backgroundColor: colors.surface,
  },
  note: { padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  noteText: { ...type.rowMeta, color: colors.text },
  stemInput: { flex: 1, minWidth: 0 },
  stemRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  trackName: { ...type.rowTitle, color: colors.text },
  trackText: { flex: 1, minWidth: 0, gap: space.xxs },
});

const noteStyles = StyleSheet.create({
  info: { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
  problem: {
    backgroundColor: colors.dangerFill,
    borderColor: colors.dangerEdge,
  },
  warning: {
    backgroundColor: colors.warningFill,
    borderColor: colors.warningEdge,
  },
});
