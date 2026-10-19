import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';

type TapEvent = { clientX: number; clientY: number };

/** The slice of the scrolling host the peek reads and listens to. */
export type PeekHost = {
  addEventListener(type: 'click', listener: (event: TapEvent) => void): void;
  getBoundingClientRect(): { left: number; top: number };
  removeEventListener(type: 'click', listener: (event: TapEvent) => void): void;
  scrollTop: number;
};

/** A part name shown next to a tap, in the host's own coordinates. */
export type PartPeek = { name: string; x: number; y: number };

// How long a tapped staff's part name stays up: long enough to read at a glance.
const PART_PEEK_MS = 2000;
const PEEK_LIFT_PX = 44;

/**
 * A tap on a staff names its part for a moment, so a singer can tell which line
 * is theirs without a label taking room while they read. `partNameAtY` takes
 * the tap's distance from the top of the drawing, scroll included.
 */
export const usePartPeek = (
  host: PeekHost | null,
  partNameAtY: (y: number) => string | undefined,
) => {
  const [peek, setPeek] = useState<PartPeek | null>(null);

  useEffect(() => {
    if (!host) {
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onTap = (event: TapEvent) => {
      const rect = host.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const name = partNameAtY(y + host.scrollTop);

      clearTimeout(timer);

      if (!name) {
        setPeek(null);
        return;
      }

      setPeek({ name, x, y });
      timer = setTimeout(() => {
        setPeek(null);
      }, PART_PEEK_MS);
    };

    host.addEventListener('click', onTap);

    return () => {
      clearTimeout(timer);
      host.removeEventListener('click', onTap);
    };
    // The caller reads the current drawing through `partNameAtY`, so it is not
    // a dependency: the listener lives as long as the host.
  }, [host]);

  return peek;
};

/** The floating label; it never takes a tap, so scrolling and tapping go through it. */
export const PartPeekLabel = ({ peek }: { peek: PartPeek }) => (
  <View
    pointerEvents="none"
    style={[
      styles.peek,
      { left: peek.x, top: Math.max(0, peek.y - PEEK_LIFT_PX) },
    ]}
  >
    <Text style={styles.text}>{peek.name}</Text>
  </View>
);

const styles = StyleSheet.create({
  peek: {
    position: 'absolute',
    maxWidth: 220,
    paddingHorizontal: appTheme.space.md,
    paddingVertical: appTheme.space.xs,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.surfaceRaised,
  },
  text: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
});
