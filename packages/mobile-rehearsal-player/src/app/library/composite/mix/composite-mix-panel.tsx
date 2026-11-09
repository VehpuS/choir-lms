import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CompositeTrack } from '@org/audio-library-models';
import { resolveStemGains, type SessionMix } from '@org/audio-mixing';

import { AppIcon } from '../../../components/app-icon';
import { buttonInteractionGuardStyle } from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { requestCompositeExport } from '../export/composite-export-request';
import { getLibraryTrack } from '../library-tracks';
import { CompositeLoadingPanel } from '../loading/composite-loading-panel';
import { useCompositeLoadState } from '../loading/composite-load-state';
import { useActiveCompositeEngine } from '../playback/use-active-composite';
import { requestStemOptions } from '../stem-options/stem-options-request';
import {
  getCompositeStore,
  useComposites,
} from '../store/composite-store-instance';
import {
  buildMixPanelModel,
  EXPORT_MIX_LABEL,
  MIX_PANEL_TITLE,
} from './mix-panel-model';
import { requestRelink } from '../relink/relink-request';
import { MixStemRow } from './mix-stem-row';
import { ManagePresetsSheet } from './manage-presets-sheet';
import { PresetsSheet } from './presets-sheet';
import {
  buildPresetMenuModel,
  SAVE_PRESET_LABEL,
  type PresetMenuRow,
} from './preset-model';
import { SavePresetSheet } from './save-preset-sheet';
import { dispatchSessionMix, useSessionMix } from './session-mix-store';

const { colors, space, type } = appTheme;
const CHEVRON_SIZE = 18;

type CompositeMixPanelViewProps = {
  composite: Pick<CompositeTrack, 'id' | 'stems' | 'presets' | 'defaultMix'>;
  session: SessionMix;
  library: Parameters<typeof buildMixPanelModel>[0]['library'];
  onToggleMute: (stemId: string) => void;
  onToggleSolo: (stemId: string) => void;
  onSetVolume: (stemId: string, volume: number) => void;
  onOpenOptions: (stemId: string) => void;
  onRemove: (stemId: string) => void;
  onRelink: (stemId: string) => void;
  onChoosePreset: (row: PresetMenuRow) => void;
  onResetMix: () => void;
  onMakeDefault: () => void;
  onMakePresetDefault: (row: PresetMenuRow) => void;
  onRenamePreset: (presetId: string, name: string) => void;
  onDeletePreset: (presetId: string) => void;
  onSavePreset: (options: { name: string; makeDefault: boolean }) => void;
  onExport: () => void;
};

/**
 * The Mix panel (composite-tracks design Decisions 7 and 10): closed it is one
 * line with the mix's name and how many stems sound; open it has a row per stem.
 */
export const CompositeMixPanelView = ({
  composite,
  library,
  onChoosePreset,
  onExport,
  onDeletePreset,
  onMakeDefault,
  onMakePresetDefault,
  onRenamePreset,
  onResetMix,
  onSavePreset,
  session,
  ...handlers
}: CompositeMixPanelViewProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [sheet, setSheet] = useState<'presets' | 'save' | 'manage' | null>(
    null,
  );
  const model = buildMixPanelModel({ composite, mix: session.mix, library });

  return (
    <View style={styles.panel}>
      <Pressable
        accessibilityLabel={MIX_PANEL_TITLE}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        aria-expanded={isOpen}
        onPress={() => setIsOpen((open) => !open)}
        style={({ pressed }) => [
          styles.header,
          buttonInteractionGuardStyle,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.title}>{MIX_PANEL_TITLE}</Text>
        {isOpen ? (
          <View style={styles.spacer} />
        ) : (
          <Text numberOfLines={1} style={styles.summary}>
            {model.summary}
          </Text>
        )}
        <AppIcon
          color={colors.textMuted}
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={CHEVRON_SIZE}
        />
      </Pressable>
      {isOpen ? (
        <>
          <View style={styles.presetRow}>
            <Pressable
              accessibilityLabel={`Mix preset: ${model.presetName}`}
              accessibilityRole="button"
              onPress={() => setSheet('presets')}
              style={[styles.chip, buttonInteractionGuardStyle]}
            >
              <Text style={styles.chipText}>{model.presetName}</Text>
              <AppIcon
                color={colors.textMuted}
                name="chevron-down"
                size={CHEVRON_SIZE}
              />
            </Pressable>
            <View style={styles.spacer} />
            <Pressable
              accessibilityLabel={SAVE_PRESET_LABEL}
              accessibilityRole="button"
              hitSlop={space.xs}
              onPress={() => setSheet('save')}
              style={buttonInteractionGuardStyle}
            >
              <Text style={styles.link}>{SAVE_PRESET_LABEL}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={EXPORT_MIX_LABEL}
              accessibilityRole="button"
              hitSlop={space.xs}
              onPress={onExport}
              style={buttonInteractionGuardStyle}
            >
              <Text style={styles.link}>{EXPORT_MIX_LABEL}</Text>
            </Pressable>
          </View>
          {model.rows.map((row) => (
            <MixStemRow key={row.stemId} row={row} {...handlers} />
          ))}
        </>
      ) : null}
      {sheet === 'presets' ? (
        <PresetsSheet
          model={buildPresetMenuModel(composite, session)}
          onChoose={(row) => {
            setSheet(null);
            onChoosePreset(row);
          }}
          onClose={() => setSheet(null)}
          onMakeDefault={() => {
            setSheet(null);
            onMakeDefault();
          }}
          onManage={() => setSheet('manage')}
          onReset={() => {
            setSheet(null);
            onResetMix();
          }}
        />
      ) : null}
      {sheet === 'manage' ? (
        <ManagePresetsSheet
          onClose={() => setSheet(null)}
          onDelete={onDeletePreset}
          onMakeDefault={onMakePresetDefault}
          onRename={onRenamePreset}
          presets={buildPresetMenuModel(composite, session).saved}
        />
      ) : null}
      {sheet === 'save' ? (
        <SavePresetSheet
          existingPresets={composite.presets}
          onCancel={() => setSheet(null)}
          onSave={(options) => {
            setSheet(null);
            onSavePreset(options);
          }}
        />
      ) : null}
    </View>
  );
};

/** The panel for the composite that is playing: reads its session mix and feeds the engine. */
export const CompositeMixPanel = ({ compositeId }: { compositeId: string }) => {
  const composites = useComposites();
  const composite = composites.find((item) => item.id === compositeId);

  if (!composite) {
    return null;
  }

  return <ConnectedPanel composite={composite} />;
};

const ConnectedPanel = ({ composite }: { composite: CompositeTrack }) => {
  const loadState = useCompositeLoadState();
  const session = useSessionMix(composite);
  const { mix } = session;
  const engine = useActiveCompositeEngine();
  const library = useMemo(
    () =>
      new Map(
        composite.stems.flatMap((stem) => {
          const track = getLibraryTrack(stem.trackId);

          return track ? [[track.id, track] as const] : [];
        }),
      ),
    [composite.stems],
  );

  // The engine ramps each change, so a drag does not click.
  useEffect(() => {
    engine?.setStemGains(resolveStemGains(composite.stems, mix));
  }, [composite.stems, engine, mix]);

  // While this composite loads there is nothing to mix yet (design mock).
  if (loadState?.compositeId === composite.id) {
    return (
      <CompositeLoadingPanel
        names={new Map(composite.stems.map((stem) => [stem.id, stem.name]))}
        state={loadState}
      />
    );
  }

  return (
    <CompositeMixPanelView
      composite={composite}
      library={library}
      session={session}
      onExport={() => requestCompositeExport({ compositeId: composite.id })}
      onOpenOptions={(stemId) =>
        requestStemOptions({ compositeId: composite.id, stemId })
      }
      onChoosePreset={(row) =>
        dispatchSessionMix(composite, { type: 'apply', mix: row.mix })
      }
      onMakeDefault={() => {
        dispatchSessionMix(composite, { type: 'set-default', mix });
        void getCompositeStore().setDefaultMix(composite.id, mix);
      }}
      onDeletePreset={(presetId) =>
        void getCompositeStore().deleteMixPreset(composite.id, presetId)
      }
      onMakePresetDefault={(row) => {
        dispatchSessionMix(composite, { type: 'set-default', mix: row.mix });
        void getCompositeStore().setDefaultMix(composite.id, row.mix);
      }}
      onRenamePreset={(presetId, name) =>
        void getCompositeStore().renameMixPreset(composite.id, presetId, name)
      }
      onResetMix={() => dispatchSessionMix(composite, { type: 'reset' })}
      onSavePreset={({ name, makeDefault }) => {
        if (makeDefault) {
          dispatchSessionMix(composite, { type: 'set-default', mix });
        }
        void getCompositeStore().saveMixPreset(composite.id, {
          name,
          mix,
          makeDefault,
        });
      }}
      onRelink={(stemId) =>
        requestRelink({ compositeId: composite.id, stemId })
      }
      onRemove={(stemId) => {
        void getCompositeStore()
          .removeStem(composite.id, stemId)
          // One stem would be left: the options sheet asks about deleting.
          .then((outcome) => {
            if (outcome === 'ask-delete') {
              requestStemOptions({ compositeId: composite.id, stemId });
            }
          });
      }}
      onSetVolume={(stemId, volume) =>
        dispatchSessionMix(composite, { type: 'set-volume', stemId, volume })
      }
      onToggleMute={(stemId) =>
        dispatchSessionMix(composite, { type: 'toggle-mute', stemId })
      }
      onToggleSolo={(stemId) =>
        dispatchSessionMix(composite, { type: 'toggle-solo', stemId })
      }
    />
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    minHeight: space.touchTarget,
  },
  panel: { gap: space.xs },
  chip: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 32,
    paddingHorizontal: space.lg,
  },
  chipText: { ...type.rowMeta, color: colors.text },
  link: {
    ...type.rowMeta,
    color: colors.accentText,
    textDecorationLine: 'underline',
  },
  presetRow: { alignItems: 'center', flexDirection: 'row', gap: space.md },
  pressed: { opacity: 0.7 },
  spacer: { flex: 1 },
  summary: {
    ...type.rowMeta,
    color: colors.textMuted,
    flex: 1,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  title: { ...type.rowTitle, color: colors.text },
});
