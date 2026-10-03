import { Slider } from '@miblanchard/react-native-slider';
import { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import {
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../../library/components/interaction-chip';
import {
  SPEED_HELPER,
  TEMPO_SOURCE_HELPER,
  getSpeedControlModel,
  getTempoSourceChips,
  resolveSpeedSliderValue,
} from './shaping-surface-model';
import {
  SCALE_LABEL_WIDTH,
  SPEED_THUMB_SIZE,
  shapingStyles as styles,
} from './styles';

type SpeedControlProps = {
  onSetSpeedMultiplier: (multiplier: number) => void;
  speedMultiplier: number;
};

export const SpeedControl = ({
  onSetSpeedMultiplier,
  speedMultiplier,
}: SpeedControlProps) => {
  const model = getSpeedControlModel(speedMultiplier);
  const [draft, setDraft] = useState(speedMultiplier);
  const [trackWidth, setTrackWidth] = useState(0);

  // A reset, a new start, or an item transform moves the value from outside.
  useEffect(() => {
    setDraft(speedMultiplier);
  }, [speedMultiplier]);

  const onLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };
  // The thumb's centre travels the track minus its own width, so the tick and
  // labels sit where the thumb is when the value is at that ratio.
  const getCentreX = (ratio: number) => {
    return SPEED_THUMB_SIZE / 2 + ratio * (trackWidth - SPEED_THUMB_SIZE);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.kicker}>Speed</Text>
        <Text
          accessibilityLabel={`Speed ${model.readout}`}
          style={[styles.readout, model.isShaped ? null : styles.readoutIdle]}
        >
          {getSpeedControlModel(draft).readout}
        </Text>
      </View>
      <View
        {...interactionGuardProps}
        onLayout={onLayout}
        style={[continuousInteractionGuardStyle, styles.sliderFrame]}
      >
        <Slider
          maximumTrackTintColor={appTheme.colors.divider}
          maximumValue={model.maximum}
          minimumTrackTintColor={appTheme.colors.accent}
          minimumValue={model.minimum}
          onValueChange={(value) => {
            const next = resolveSpeedSliderValue(value);

            setDraft(next);
            onSetSpeedMultiplier(next);
          }}
          step={model.step}
          thumbStyle={styles.thumbStyle}
          thumbTintColor={appTheme.colors.text}
          trackStyle={styles.trackStyle}
          value={draft}
        />
        {trackWidth > 0 ? (
          <View
            pointerEvents="none"
            style={[styles.detentTick, { left: getCentreX(model.detentRatio) }]}
          />
        ) : null}
      </View>
      <View style={styles.scaleRow}>
        {trackWidth > 0
          ? model.scaleLabels.map((scaleLabel, index) => {
              const isFirst = index === 0;
              const isLast = index === model.scaleLabels.length - 1;

              // The end labels sit flush with the track's edges; only the
              // 1.00× label is centred under the detent.
              return (
                <Text
                  key={scaleLabel.label}
                  style={[
                    styles.scaleLabel,
                    isFirst ? styles.scaleLabelFirst : null,
                    isLast ? styles.scaleLabelLast : null,
                    isFirst || isLast
                      ? null
                      : {
                          left:
                            getCentreX(scaleLabel.ratio) -
                            SCALE_LABEL_WIDTH / 2,
                        },
                  ]}
                >
                  {scaleLabel.label}
                </Text>
              );
            })
          : null}
      </View>
      <Text style={styles.helper}>{SPEED_HELPER}</Text>
      <TempoSourceChips />
    </View>
  );
};

const TempoSourceChips = () => {
  return (
    <View style={styles.section}>
      <Text style={styles.kicker}>Tempo source</Text>
      <View style={styles.chipRow}>
        {getTempoSourceChips().map((chip) => (
          <InteractionChip
            accessibilityHint={chip.disabled ? 'Not available yet' : undefined}
            accessibilitySelected={chip.selected}
            disabled={chip.disabled}
            key={chip.key}
            label={chip.label}
            variant={chip.selected ? 'selected' : 'passive'}
          />
        ))}
      </View>
      <Text style={styles.helper}>{TEMPO_SOURCE_HELPER}</Text>
    </View>
  );
};
