## Why

Issue #40: when Google Drive is disconnected or expired, every saved track row repeats a two-line red message, which wraps on standard phones. Session problems and file problems look the same.

## What changes (mock only, pending approval)

- Session-level states (expired, never signed in) show one single-line global banner with a Reconnect / Connect action. Rows dim and use a cloud-slash icon, with no per-row message.
- File-level states (needs access, not found, access removed, offline) show a short chip on the affected row. The full sentence stays in the row menu.
- See `mock.html` (source) and `mock.png` (render at 390pt).

## Status

Mock awaiting approval. No implementation, specs or tasks yet.
