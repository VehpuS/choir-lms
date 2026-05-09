import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { hasGoogleAuthConfig, runtimeConfig } from '../config/runtime';

type BulletListProps = {
  items: string[];
};

type SummaryCardProps = {
  eyebrow: string;
  title: string;
  body: string;
};

const PRODUCT_PILLARS = [
  'Browse rehearsal audio from Google Drive.',
  'Save precise loop ranges for repeated practice.',
  'Build playlists for personal and sectional sessions.',
];

const CURRENT_FOCUS = [
  'Drive-backed library browsing and playback.',
  'Loop creation with named practice segments.',
  'Playlist assembly, ordered playback, repeat, and shuffle.',
];

const AUDIO_FORMAT_LABEL = runtimeConfig.supportedAudioExtensions
  .map((extension) => extension.toUpperCase())
  .join(', ');

const GOOGLE_AUTH_STATUS = hasGoogleAuthConfig()
  ? 'Configured'
  : 'Pending credentials';

const BORDER_COLOR = '#d6d1c4';
const CARD_BACKGROUND = '#f8f1e3';
const HERO_BACKGROUND = '#173229';
const LIST_MARKER = '#305c4d';
const PAGE_BACKGROUND = '#efe7d8';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';
const SURFACE_BACKGROUND = '#fffdf8';

const SummaryCard = ({ eyebrow, title, body }: SummaryCardProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
};

const BulletList = ({ items }: BulletListProps) => {
  return (
    <View style={styles.list}>
      {items.map((item) => {
        return (
          <View key={item} style={styles.listItem}>
            <View style={styles.listMarker} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
};

export const App = () => {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>Choir LMS</Text>
          <Text style={styles.title}>Mobile rehearsal player foundation</Text>
          <Text style={styles.subtitle}>
            A focused practice surface for choir members to find rehearsal
            audio, save repeatable loops, and build session playlists.
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusPill}>
              <Text style={styles.statusLabel}>Google auth</Text>
              <Text style={styles.statusValue}>{GOOGLE_AUTH_STATUS}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusLabel}>Audio support</Text>
              <Text style={styles.statusValue}>{AUDIO_FORMAT_LABEL}</Text>
            </View>
          </View>
        </View>

        <SummaryCard
          eyebrow="Product direction"
          title="Built for deliberate self-rehearsal"
          body="The first delivery slice stays narrow: reliable personal practice workflows on top of shared choir audio before broader choir operations and collaboration features."
        />

        <SummaryCard
          eyebrow="Runtime configuration"
          title="Drive access is read-only by default"
          body={`Scheme ${runtimeConfig.scheme} uses ${runtimeConfig.google.driveScope} and prepares iOS bundle ${runtimeConfig.iosBundleIdentifier} with Android package ${runtimeConfig.androidPackage}.`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core rehearsal workflows</Text>
          <BulletList items={PRODUCT_PILLARS} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current implementation focus</Text>
          <BulletList items={CURRENT_FOCUS} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  hero: {
    gap: 12,
    padding: 24,
    borderRadius: 24,
    backgroundColor: HERO_BACKGROUND,
  },
  kicker: {
    color: '#d1e8dd',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff8ef',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  subtitle: {
    color: '#dce7e1',
    fontSize: 16,
    lineHeight: 24,
  },
  statusRow: {
    gap: 12,
  },
  statusPill: {
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 248, 239, 0.12)',
  },
  statusLabel: {
    color: '#dce7e1',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusValue: {
    color: '#fff8ef',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    gap: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    backgroundColor: CARD_BACKGROUND,
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  cardBody: {
    color: SECONDARY_TEXT,
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    backgroundColor: SURFACE_BACKGROUND,
  },
  sectionTitle: {
    color: PRIMARY_TEXT,
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  listMarker: {
    width: 8,
    height: 8,
    marginTop: 7,
    borderRadius: 999,
    backgroundColor: LIST_MARKER,
  },
  listText: {
    flex: 1,
    color: SECONDARY_TEXT,
    fontSize: 15,
    lineHeight: 22,
  },
});
