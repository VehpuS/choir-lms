import assert from 'node:assert/strict';

import {
  libraryFileTreeStorageKey,
  storageKey,
} from '@org/audio-library-runtime';
import type {
  DriveAudioSource,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import {
  buildTrackRenameMockLibrary,
  MOCK_LIBRARY_OWNER_ID,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { runScenario, type ScenarioContext } from './scenario-runner';

// Live check for issue #42 (track renaming). Usage, after
// `nx run mobile-rehearsal-player:build`:
//   npx tsx tools/browser-session/track-rename.scenario.ts <outDir>
const WAIT_MS = 5000;
// Dialogs fade in; a screenshot taken sooner catches them half-drawn.
const DIALOG_SETTLE_MS = 500;
const CHOICE_KEY = 'choirlms.library.track-rename-copies-choice';
const SOURCES_KEY = storageKey('sources', MOCK_LIBRARY_OWNER_ID);
const TREE_KEY = libraryFileTreeStorageKey(MOCK_LIBRARY_OWNER_ID);

const trackNames = async ({ session }: ScenarioContext) =>
  ((await session.readStored<DriveAudioSource[]>(SOURCES_KEY)) ?? [])
    .map(({ name }) => name)
    .sort();

const storedChoice = ({ page }: ScenarioContext) =>
  page.evaluate((key) => window.localStorage.getItem(key), CHOICE_KEY);

const copyNames = async ({ session }: ScenarioContext) => {
  const tree = await session.readStored<RehearsalLibraryFileTree>(TREE_KEY);

  return (tree?.fileLinks ?? [])
    .map(({ entityId, visibleName }) => `${entityId}:${visibleName ?? ''}`)
    .sort();
};

const renameFromMenu = async (
  { page, shot }: ScenarioContext,
  trackName: string,
  nextName: string,
) => {
  await page.getByLabel(`${trackName} options`).first().click();
  await page.getByText('Rename', { exact: true }).last().click();
  const input = page.getByRole('textbox');

  await input.fill(nextName);
  await page.waitForTimeout(DIALOG_SETTLE_MS);
  await shot('rename-dialog');
  await page.getByText('Rename', { exact: true }).last().click();
};

const openView = async ({ page }: ScenarioContext, view: string) => {
  await page.getByText(view, { exact: true }).first().click();
};

void runScenario({
  library: buildTrackRenameMockLibrary(),
  steps: async (context) => {
    const { page, pass, shot } = context;

    await page.getByLabel('Alto Part options').first().waitFor();

    // 1. Tracks view: Rename is an overflow action and renames the track.
    await openView(context, 'Tracks');
    await page.getByLabel('Soprano Part options').first().click();
    await page.getByText('Rename', { exact: true }).waitFor();
    await shot('1-tracks-overflow-rename');
    await page.getByText('Cancel', { exact: true }).last().click();
    await renameFromMenu(context, 'Soprano Part', 'Soprano 1');
    await page.getByText('Soprano 1').first().waitFor({ timeout: WAIT_MS });
    await shot('2-tracks-renamed');
    assert.ok((await trackNames(context)).includes('Soprano 1'));
    pass('Tracks view rename');

    // 2. Files: renaming the only copy renames the track entry as well.
    await openView(context, 'Files');
    await renameFromMenu(context, 'Soprano 1', 'Soprano 2');
    await page.getByText('Soprano 2').first().waitFor({ timeout: WAIT_MS });
    await shot('3-files-only-copy-renamed');
    assert.ok((await trackNames(context)).includes('Soprano 2'));
    pass('Files rename of the only copy renames the track');

    // 3. Files: several copies prompt for a choice; "this copy" keeps the track.
    await renameFromMenu(context, 'Alto Part', 'Alto Local');
    await page.getByText('Rename this copy only').waitFor({ timeout: WAIT_MS });
    await page.waitForTimeout(DIALOG_SETTLE_MS);
    await shot('4-copies-prompt');
    await page.getByText('Rename this copy only').click();
    await page.getByText('Alto Local').first().waitFor({ timeout: WAIT_MS });
    assert.ok((await trackNames(context)).includes('Alto Part'));
    assert.ok(
      (await copyNames(context)).some((n) => n.endsWith(':Alto Local')),
    );
    pass('Rename this copy leaves the track and other copies');

    // 4. Files: "all copies" renames the track and every copy; remember it.
    await renameFromMenu(context, 'Alto Local', 'Alto All');
    await page.getByLabel('Remember my choice').click();
    await shot('5-remember-toggled');
    await page.getByText('Rename all copies and the track').click();
    await page.getByText('Alto All').first().waitFor({ timeout: WAIT_MS });
    assert.ok((await trackNames(context)).includes('Alto All'));
    assert.equal(
      (await copyNames(context)).filter((n) => n.endsWith(':Alto All')).length,
      3,
    );
    await shot('6-all-copies-renamed');
    pass('Rename all copies renames the track and every copy');

    // 5. The remembered choice skips the prompt next time.
    await renameFromMenu(context, 'Alto All', 'Alto Final');
    await page.getByText('Alto Final').first().waitFor({ timeout: WAIT_MS });
    assert.equal(await page.getByText('Rename this copy only').count(), 0);
    assert.ok((await trackNames(context)).includes('Alto Final'));
    pass('Remembered choice skips the prompt');

    // 6. Settings > Renaming clears the remembered choice, so the prompt returns.
    await page.getByLabel('Open Drive session menu').first().click();
    await page.getByText('Settings', { exact: true }).click();
    await page.getByLabel('Renaming').click();
    await page.waitForTimeout(DIALOG_SETTLE_MS);
    await shot('7-settings-renaming');
    assert.equal(await storedChoice(context), 'all');
    await page.getByLabel('Ask each time').click();
    await page.waitForFunction(
      (key) => window.localStorage.getItem(key) === null,
      CHOICE_KEY,
      { timeout: WAIT_MS },
    );
    await page.getByLabel('Close settings').click();
    await renameFromMenu(context, 'Alto Final', 'Alto Again');
    await page.getByText('Rename this copy only').waitFor({ timeout: WAIT_MS });
    await shot('8-prompt-after-clearing');
    await page.getByText('Cancel', { exact: true }).last().click();
    pass('Clearing the choice in Settings brings the prompt back');
  },
});
