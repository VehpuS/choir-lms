import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { SearchSourceButton } from './search-source-button';
import {
  resetSearchSources,
  updateSearchSources,
} from './search-sources-store';

const QUERY = { artist: 'Queen', title: 'Bohemian Rhapsody' };

describe('SearchSourceButton', () => {
  afterEach(() => {
    cleanup();
    resetSearchSources('sheet-music');
    resetSearchSources('lyrics');
  });

  it('searches the first source for the title and artist', () => {
    const opened: string[] = [];

    render(
      <SearchSourceButton
        kind="sheet-music"
        onOpen={(url) => opened.push(url)}
        query={QUERY}
      />,
    );
    fireEvent.press(screen.getByLabelText('Search MuseScore'));

    assert.deepEqual(opened, [
      'https://musescore.com/sheetmusic?text=Bohemian%20Rhapsody%20Queen',
    ]);
  });

  it('follows the first source the user put on the list', () => {
    updateSearchSources('lyrics', [
      {
        id: 'genius',
        label: 'Genius',
        urlTemplate: 'https://genius.com/search?q={query}',
      },
    ]);

    const opened: string[] = [];

    render(
      <SearchSourceButton
        kind="lyrics"
        onOpen={(url) => opened.push(url)}
        query={QUERY}
      />,
    );
    fireEvent.press(screen.getByLabelText('Search Genius'));

    assert.deepEqual(opened, [
      'https://genius.com/search?q=Bohemian%20Rhapsody%20Queen',
    ]);
  });

  it('offers the dropdown only when there is somewhere else to search', () => {
    updateSearchSources('lyrics', [
      {
        id: 'genius',
        label: 'Genius',
        urlTemplate: 'https://genius.com/search?q={query}',
      },
    ]);
    render(
      <SearchSourceButton
        kind="lyrics"
        onOpen={() => undefined}
        query={QUERY}
      />,
    );

    assert.equal(screen.queryByLabelText('Choose where to search'), null);
  });

  it('shows the dropdown with several sources and disables the search with no title', () => {
    render(
      <SearchSourceButton
        disabled
        kind="sheet-music"
        onOpen={() => undefined}
        query={QUERY}
      />,
    );

    assert.ok(screen.getByLabelText('Choose where to search'));
    assert.equal(
      screen.getByLabelText('Search MuseScore').props['aria-disabled'] ??
        screen.getByLabelText('Search MuseScore').props.disabled,
      true,
    );
  });
});
