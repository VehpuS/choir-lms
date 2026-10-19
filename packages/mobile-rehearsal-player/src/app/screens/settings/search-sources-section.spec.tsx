import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import {
  resetSearchSources,
  updateSearchSources,
} from '../../library/search-sources/search-sources-store';
import { hasRenderedText } from '../../../test-support/rendered-text';
import { SearchSourcesSection } from './search-sources-section';

const orderOf = (labels: readonly string[]): string[] => {
  const tree = JSON.stringify(screen.toJSON());

  return labels
    .map((label) => ({ at: tree.indexOf(`"Remove ${label}"`), label }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ label }) => label);
};

describe('SearchSourcesSection', () => {
  afterEach(() => {
    cleanup();
    resetSearchSources('sheet-music');
    resetSearchSources('lyrics');
  });

  it('lists the built-ins with the same arrows and drag handle as every list', () => {
    render(<SearchSourcesSection kind="sheet-music" />);

    assert.deepEqual(orderOf(['MuseScore', 'IMSLP', 'Web (PDF)']), [
      'MuseScore',
      'IMSLP',
      'Web (PDF)',
    ]);
    assert.ok(screen.getByLabelText('Move IMSLP up'));
    assert.ok(screen.getByLabelText('Drag IMSLP to reorder'));
    assert.ok(hasRenderedText('musescore.com'));
  });

  it('reorders with the arrows, so the default can change', () => {
    render(<SearchSourcesSection kind="sheet-music" />);
    fireEvent.press(screen.getByLabelText('Move IMSLP up'));

    assert.deepEqual(orderOf(['MuseScore', 'IMSLP', 'Web (PDF)']), [
      'IMSLP',
      'MuseScore',
      'Web (PDF)',
    ]);
  });

  it('removes a source, offers it again, and adds it back', () => {
    render(<SearchSourcesSection kind="sheet-music" />);
    fireEvent.press(screen.getByLabelText('Remove IMSLP'));

    assert.equal(screen.queryByLabelText('Remove IMSLP'), null);

    fireEvent.press(screen.getByLabelText('Add IMSLP'));

    assert.deepEqual(orderOf(['MuseScore', 'IMSLP', 'Web (PDF)']), [
      'MuseScore',
      'Web (PDF)',
      'IMSLP',
    ]);
  });

  it('will not remove the last source', () => {
    updateSearchSources('lyrics', [
      {
        id: 'genius',
        label: 'Genius',
        urlTemplate: 'https://genius.com/search?q={query}',
      },
    ]);
    render(<SearchSourcesSection kind="lyrics" />);

    const remove = screen.getByLabelText('Remove Genius');

    assert.equal(
      remove.props['aria-disabled'] === true || remove.props.disabled === true,
      true,
    );
  });

  it('refuses a custom address that is not https and keeps the form open', () => {
    render(<SearchSourcesSection kind="lyrics" />);
    fireEvent.press(screen.getByLabelText('Other… Lyrics search'));
    fireEvent.changeText(screen.getByLabelText('Lyrics search name'), 'Mine');
    fireEvent.changeText(
      screen.getByLabelText('Lyrics search address'),
      'http://mine.example/?q={query}',
    );
    fireEvent.press(screen.getByLabelText('Add to Lyrics search'));

    assert.ok(hasRenderedText('The address must start with https.'));
    assert.equal(screen.queryByLabelText('Remove Mine'), null);
  });

  it('adds a valid custom source last', () => {
    render(<SearchSourcesSection kind="lyrics" />);
    fireEvent.press(screen.getByLabelText('Other… Lyrics search'));
    fireEvent.changeText(screen.getByLabelText('Lyrics search name'), 'Mine');
    fireEvent.changeText(
      screen.getByLabelText('Lyrics search address'),
      'https://mine.example/?q={query}',
    );
    fireEvent.press(screen.getByLabelText('Add to Lyrics search'));

    assert.deepEqual(orderOf(['Google', 'DuckDuckGo', 'Genius', 'Mine']), [
      'Google',
      'DuckDuckGo',
      'Genius',
      'Mine',
    ]);
  });
});
