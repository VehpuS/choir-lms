import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { join, map, toUpper } from 'es-toolkit/compat';

import { runtimeConfig } from '../../config/runtime';
import { BulletList } from '../components/BulletList';
import { SummaryCard } from '../components/SummaryCard';
import { DriveAuthorizationCard } from '../auth/components/DriveAuthorizationCard';
import { useGoogleDriveAuthorization } from '../auth/hooks/use-google-drive-authorization';
import { DriveLibrarySection } from '../library/components/DriveLibrarySection';
import { appTheme } from '../utils/theme';

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

const AUDIO_FORMAT_LABEL = join(
  map(runtimeConfig.supportedAudioExtensions, (extension) =>
    toUpper(extension),
  ),
  ', ',
);

const getGoogleAuthStatusLabel = (options: {
  googleAuthConfigured: boolean;
  status: 'unconfigured' | 'authorized' | 'expired' | 'attention-required';
}) => {
  if (!options.googleAuthConfigured) {
    return 'Credentials missing';
  }

  if (options.status === 'authorized') {
    return 'Connected';
  }

  if (options.status === 'expired') {
    return 'Expired';
  }

  if (options.status === 'attention-required') {
    return 'Needs attention';
  }

  return 'Ready to connect';
};

export const HomeScreen = () => {
  const {
    authState,
    canClearAuthorization,
    canStartAuthorization,
    clearAuthorization,
    googleAuthConfigured,
    isBusy,
    requestReady,
    startAuthorization,
    statusCopy,
  } = useGoogleDriveAuthorization();

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
              <Text style={styles.statusValue}>
                {getGoogleAuthStatusLabel({
                  googleAuthConfigured,
                  status: authState.status,
                })}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusLabel}>Audio support</Text>
              <Text style={styles.statusValue}>{AUDIO_FORMAT_LABEL}</Text>
            </View>
          </View>
        </View>

        <SummaryCard
          body="The first delivery slice stays narrow: reliable personal practice workflows on top of shared choir audio before broader choir operations and collaboration features."
          eyebrow="Product direction"
          title="Built for deliberate self-rehearsal"
        />

        <SummaryCard
          body={`Scheme ${runtimeConfig.scheme} uses ${runtimeConfig.google.driveScope} and prepares iOS bundle ${runtimeConfig.iosBundleIdentifier} with Android package ${runtimeConfig.androidPackage}.`}
          eyebrow="Runtime configuration"
          title="Drive access is read-only by default"
        />

        <DriveAuthorizationCard
          authState={authState}
          canClearAuthorization={canClearAuthorization}
          canStartAuthorization={canStartAuthorization}
          isBusy={isBusy}
          onClearAuthorization={() => {
            void clearAuthorization();
          }}
          onStartAuthorization={() => {
            void startAuthorization();
          }}
          requestReady={requestReady}
          statusCopy={statusCopy}
        />

        <DriveLibrarySection
          authState={authState}
          googleAuthConfigured={googleAuthConfigured}
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
    backgroundColor: appTheme.colors.pageBackground,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  hero: {
    gap: 12,
    padding: 24,
    borderRadius: 24,
    backgroundColor: appTheme.colors.heroBackground,
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
  section: {
    gap: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 20,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  sectionTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
  },
});
