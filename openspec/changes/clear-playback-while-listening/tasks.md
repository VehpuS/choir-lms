## 1. Findings (this draft)

- [x] 1.1 Record the symptom, what was tried and the hypotheses (`design.md`)
- [x] 1.2 Keep the experimental settings in the app (Settings > Microphone > "Sound while listening") until a solution replaces them

## 2. Exploration (next)

- [ ] 2.1 Baseline on the maintainer's phone and earbuds in native apps: Voice Memos or a DAW recording the phone's microphone over a backing track, with and without Bluetooth output; note whether the output stays stereo and for how long. Decides whether the platform allows "built-in microphone in, Bluetooth stereo out" at all.
- [ ] 2.2 Record the iOS version, the earbuds' model, and whether a Safari tab behaves like the home-screen app
- [ ] 2.3 Survey existing DAW and recording apps for input and output device handling on Bluetooth and for output-latency compensation
- [ ] 2.4 Decide: web-only mitigation, a native audio path, or documenting the limit; then write the solution as its own change with a design and tasks
- [ ] 2.5 (Optional experiment) the microphone context without an output connection, checked on the device

## 3. Verify

- [ ] 3.1 Whatever the solution is, on the maintainer's iPhone with Bluetooth earbuds: a queue playing with pitch detection on stays clear across songs, pause and resume, and recording over a playing track stays aligned
