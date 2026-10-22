import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { createSaveFlow, type SaveFlowState } from './save-flow-model';
import { SaveFlowPanel, type SaveFlowPanelProps } from './save-flow-panel';

const calls: string[] = [];
const record = (name: string) => () => {
  calls.push(name);
};

const renderPanel = (
  state: SaveFlowState,
  overrides: Partial<SaveFlowPanelProps> = {},
) => {
  render(
    <SaveFlowPanel
      hasAskedForPermission={false}
      hasWriteAccess
      isAuthorizing={false}
      onAllowSaving={record('allow')}
      onCancelUpload={record('cancel-upload')}
      onChangeFolder={record('change-folder')}
      onChooseFile={record('choose-file')}
      onClose={record('close')}
      onOpenLink={record('open-link')}
      onRetry={record('retry')}
      state={state}
      {...overrides}
    />,
  );
};

describe('SaveFlowPanel', () => {
  afterEach(() => {
    cleanup();
    calls.length = 0;
  });

  it('shows the two link steps and wires their buttons', () => {
    renderPanel(createSaveFlow('link'));

    assert.ok(hasRenderedText('1. Open the link'));
    assert.ok(hasRenderedText('2. Choose the downloaded file'));
    fireEvent.press(screen.getByLabelText('Open the link'));
    fireEvent.press(screen.getByLabelText('Choose file'));
    assert.deepEqual(calls, ['open-link', 'choose-file']);
  });

  it('shows only the file step when saving a device file, with a refusal explained', () => {
    renderPanel({ ...createSaveFlow('device'), refusal: 'html-page' });

    assert.ok(hasRenderedText('Choose a file from this device'));
    assert.equal(screen.queryByLabelText('Open the link'), null);
    assert.ok(hasRenderedText('That file is a web page'));
  });

  it('asks for the write permission before anything else when the session lacks it', () => {
    renderPanel(createSaveFlow('link'), { hasWriteAccess: false });

    assert.ok(hasRenderedText('Allow saving to Drive'));
    assert.equal(screen.queryByLabelText('Choose file'), null);
    fireEvent.press(screen.getByLabelText('Allow saving'));
    assert.deepEqual(calls, ['allow']);
  });

  it('says the permission was not granted after the user has been asked', () => {
    renderPanel(createSaveFlow('link'), {
      hasAskedForPermission: true,
      hasWriteAccess: false,
    });

    assert.ok(hasRenderedText('Saving to Drive was not allowed'));
  });

  it('shows the upload with a cancel', () => {
    renderPanel({
      ...createSaveFlow('link'),
      file: {
        bytes: new Uint8Array(),
        format: 'pdf',
        mimeType: 'application/pdf',
        name: 'Kyrie.pdf',
        status: 'accepted',
      },
      step: 'uploading',
      target: { folderId: 'f', folderName: 'Scores' },
    });

    assert.ok(hasRenderedText('Saving Kyrie.pdf to Scores'));
    fireEvent.press(screen.getByLabelText('Cancel'));
    assert.deepEqual(calls, ['cancel-upload']);
  });

  it('shows a failure with the step that fixes it', () => {
    renderPanel({
      ...createSaveFlow('link'),
      failure: 'folder-not-writable',
      step: 'failed',
    });

    assert.ok(hasRenderedText('Cannot save to that folder'));
    fireEvent.press(screen.getByLabelText('Choose another folder'));
    assert.deepEqual(calls, ['change-folder']);
  });

  it('tells the user when the link was removed while the file saved', () => {
    renderPanel({
      ...createSaveFlow('link'),
      sourceRemoved: true,
      step: 'saved',
    });

    assert.ok(hasRenderedText('its link was removed'));
  });
});
