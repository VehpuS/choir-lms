// Lets component specs run under `tsx --test`. React Native ships untransformed
// Flow source that node cannot load, so every `require('react-native')` is
// answered by react-native-web (plain JS, same component API), and the icon
// library, whose source needs native SVG, is replaced by empty views.
//
//
// react-native-web's TextInput also listens for `selectionchange` on `document`,
// which node does not have, so a two-method stand-in is provided.
//
// Loaded with `--require` by the `test` targets in package.json.
const Module = require('node:module');
const path = require('node:path');

const resolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, ...rest) {
  if (request === 'react-native') {
    return resolveFilename.call(this, 'react-native-web', ...rest);
  }

  if (request.startsWith('phosphor-react-native')) {
    return path.join(__dirname, 'phosphor-icon-stub.cjs');
  }

  return resolveFilename.call(this, request, ...rest);
};

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
}
