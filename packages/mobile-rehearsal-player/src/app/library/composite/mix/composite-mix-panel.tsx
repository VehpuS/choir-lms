import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CompositeTrack } from '@org/audio-library-models';
import { resolveStemGains } from '@org/audio-mixing';

import { AppIcon } from '../../../components/app-icon';
import { buttonInteractionGuardStyle } from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { getLibraryTrack } from '../library-tracks';
import { useActiveCompositeEngine } from '../playback/use-active-composite';
import { requestStemOptions } from '../stem-options/stem-options-request';
import {
  getCompositeStore,
  useComposites,
} from '../store/composite-store-instance';
import { buildMixPanelModel, MIX_PANEL_TITLE } from './mix-panel-model';
import { MixStemRow } from './mix-stem-row';
import { dispatchSessionMix, useSessionMix } from './session-mix-store';

const { colors, space, type } = appTheme;
const CHEVRON_SIZE = 18;

type CompositeMixPanelViewProps = {
  composite: Pick<CompositeTrack, 'id' | 'stems' | 'presets' | 'defaultMix'>;
  mix: Parameters<typeof buildMixPanelModel>[0]['mix'];
  library: Parameters<typeof buildMixPanelModel>[0]['library'];
  onToggleMute: (stemId: string) => void;
  onToggleSolo: (stemId: string) => void;
  onSetVolume: (stemId: string, volume: number) => void;
  onOpenOptions: (stemId: string) => void;
  onRemove: (stemId: string) => void;
};

/**
 * The Mix panel (composite-tracks design Decisions 7 and 10): closed it is one
 * line with the mix's name and how many stems sound; open it has a row per stem.
 */
export const CompositeMixPanelView = ({
  composite,
  library,
  mix,
  ...handlers
}: CompositeMixPanelViewProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const model = buildMixPanelModel({ composite, mix, library });

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
          <Text style={styles.preset}>{model.summary}</Text>
          {model.rows.map((row) => (
            <MixStemRow key={row.stemId} row={row} {...handlers} />
          ))}
        </>
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
  const { mix } = useSessionMix(composite);
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

  return (
    <CompositeMixPanelView
      composite={composite}
      library={library}
      mix={mix}
      onOpenOptions={(stemId) =>
        requestStemOptions({ compositeId: composite.id, stemId })
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
  preset: { ...type.rowMeta, color: colors.textMuted },
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
