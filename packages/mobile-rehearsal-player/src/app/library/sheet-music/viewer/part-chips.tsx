import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';
import type { MyPartChip } from '../voice-part/voice-part-preferences';
import { buildPartChips, describePartNotices } from './model';
import type { ScoreInfo } from './sheet-music-surface-types';

type PartChipsProps = {
  info: ScoreInfo;
  myPart?: MyPartChip;
  onPressChip: (key: string) => void;
  onPressMyPart: (chip: MyPartChip) => void;
};

/**
 * The part controls: the vocal and all-parts presets, one toggle per part, and
 * `Make <Part> my part` while the shown parts are one section.
 */
export const PartChips = ({
  info,
  myPart,
  onPressChip,
  onPressMyPart,
}: PartChipsProps) => {
  return (
    <>
      {buildPartChips(info.parts, info.resolved).map((chip) => (
        <InteractionChip
          accessibilityLabel={chip.accessibilityLabel}
          accessibilitySelected={chip.isOn}
          key={chip.key}
          label={chip.label}
          onPress={() => onPressChip(chip.key)}
          variant={chip.isOn ? 'selected' : 'passive'}
        />
      ))}
      {myPart ? (
        <>
          <ChipDivider />
          <InteractionChip
            accessibilityLabel={myPart.accessibilityLabel}
            accessibilitySelected={myPart.isOn}
            label={myPart.label}
            onPress={() => onPressMyPart(myPart)}
            variant={myPart.isOn ? 'selected' : 'passive'}
          />
        </>
      ) : null}
    </>
  );
};

/** Why the shown parts are not what was asked for, when they are not. */
export const PartNotices = ({ info }: { info: ScoreInfo }) => {
  const notices = describePartNotices(info.resolved.notices);

  return (
    <View style={styles.notices}>
      {notices.map((notice) => (
        <Text key={notice} style={styles.notice}>
          {notice}
        </Text>
      ))}
    </View>
  );
};

/** A thin rule between two groups of chips that share one row. */
export const ChipDivider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: appTheme.space.xs,
    backgroundColor: appTheme.colors.divider,
  },
  notice: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  notices: {
    gap: appTheme.space.xxs,
  },
});
