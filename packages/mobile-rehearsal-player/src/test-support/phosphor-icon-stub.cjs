// Stands in for every export of phosphor-react-native: an empty view. Specs
// assert on labels and behavior, never on the drawn icon.
const React = require('react');
const { View } = require('react-native-web');

const Icon = () => React.createElement(View, null);

module.exports = new Proxy(
  { __esModule: true },
  { get: (target, key) => (key === '__esModule' ? true : Icon) },
);
