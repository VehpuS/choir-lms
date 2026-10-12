// A list heading's count. While a filter or search narrows the list it reads
// `1 of 13`, so the number never looks like the size of the whole library
// (task 8.19); an unfiltered list keeps the plain total.
export const formatSectionCount = (visible: number, total: number): string =>
  visible < total ? `${visible} of ${total}` : `${visible}`;
