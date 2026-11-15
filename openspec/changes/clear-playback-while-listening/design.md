## Context

### Environment of the reports

- iPhone 17 Pro on iOS 26.6.2 with Soundcore P40i Bluetooth earbuds, the app added to the home screen (the web app as a standalone app, not a Safari tab).
- Chrome on a Mac was not reported as affected; the maintainer tests on Chrome (Mac) and the iPhone only.
- Unreproducible in CI: Chromium has no Bluetooth route and no iOS audio session. The browser scenarios check what the page asks for, never what iOS does.

### Symptom

1. A track (or queue) plays through Bluetooth earbuds with a microphone open (pitch detection on, or recording).
2. Playback starts clear, and after about one to two seconds changes, suddenly, to a thin, low-quality sound.
3. The next song in a queue starts clear again and degrades again after the same delay. Pausing and resuming does the same.
4. It happens with no sound made into the microphone.
5. It does not happen with the iPhone's speaker, and not with a track or the piano alone.
6. A screen recording made while it happened sounded normal.

### Tried in the web app (all on the maintainer's iPhone, none avoided it)

| Idea                                                                     | Release                       | Result                                                                 |
| ------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| The browser's own session (`auto`)                                       | before the audio-session work | already degraded                                                       |
| `playback` session while the piano is open                               | piano first-sound fix         | broke the microphone ("No microphone found")                           |
| `play-and-record` while a microphone is open                             | `piano-first-sound-on-launch` | microphone works; degradation still there                              |
| Choose the iPhone's own microphone (`deviceId` as an `ideal` constraint) | `microphone-choice`           | degradation still there; which input really opened was never read back |
| "Sound while listening" = Automatic                                      | `microphone-choice`           | no difference                                                          |
| "Sound while listening" = Playback once the microphone is on             | `microphone-choice`           | no help; whether the microphone kept hearing was not reported          |

## Findings

### 1. What Safari does when a page captures (WebKit source, `main`, read 2026-11-15)

`Source/WebCore/platform/audio/cocoa/MediaSessionManagerCocoa.mm`, `updateSessionState()`:

- If the page set an audio session type, that becomes the category. Otherwise, with any active audio capture, the category is play-and-record with mode `VideoChat`.
- After that, **any** play-and-record category with the default mode is changed to `VideoChat`. So `navigator.audioSession.type = 'play-and-record'` and `'auto'` end in the same place while capturing.
- `Source/WebCore/Modules/audiosession/DOMAudioSession.cpp` maps the page's type to a category only (`playback` to media playback, `play-and-record` to play-and-record). There is no way to pass a mode or an option.

`Source/WebCore/platform/audio/ios/AudioSessionIOS.mm`, `setCategory()`, for play-and-record:

```objc
options |= AVAudioSessionCategoryOptionAllowBluetooth
         | AVAudioSessionCategoryOptionAllowBluetoothA2DP
         | AVAudioSessionCategoryOptionAllowAirPlay;
// plus AVAudioSessionCategoryOptionDefaultToSpeaker unless the receiver is preferred
```

`AllowBluetooth` is the hands-free (HFP) option. It is always set, with a FIXME only about its deprecated name. Every other category gets no options. `Source/WebCore/platform/mediastream/ios/AVAudioSessionCaptureDeviceManager.mm` turns a chosen `deviceId` into `setPreferredInput:` on the shared session.

What this explains:

- **Why the settings did nothing.** `auto` and `play-and-record` produce the same session (play-and-record, video chat, HFP allowed). `playback` has no input at all. The session type is therefore not the lever; it does not follow that the page has no lever (Findings 4).
- **Why Bluetooth only.** With HFP allowed and an input open, iOS routes a headset through the hands-free profile, which carries input and output together as mono narrowband audio. The speaker has no such profile. A screen recording taps the audio before the route.
- **Not explained by the source:** the one to two clear seconds after each start. The likely reason is that the session or route is re-applied when an element starts and the hands-free link takes that long to come up, with A2DP carrying the sound meanwhile. This is a guess, and it matters: a per-start reset points at the media element's start as the trigger (Findings 4).

A search result describes an open WebKit bug (311451: output degraded and mono after `getUserMedia` on iOS, `echoCancellation: false` not helping, still present in iOS 26.4). The bug tracker was not reachable from the exploration session, so this is unverified; task 5.2 checks it.

### 2. Native apps (kept for later)

Native recording apps avoid the hands-free route with a play-and-record session that allows only the A2DP Bluetooth option. That path, with the libraries that fit this repo, is recorded in `native-playback-follow-ups` 1.12(g) and is not part of this change: native parity comes after the web app is stable (maintainer, 2026-11-15).

### 3. A browser DAW does it

The maintainer retested Soundtrap in a browser tab on the phone, with the same earbuds: it plays while recording without the thin sound (mono material, so stereo was not judged). Soundtrap runs on the same WebKit with the same fixed session, so the session does not force the thin sound by itself. A browser DAW plays through Web Audio; this app plays single tracks through a media element.

### 4. Device results (maintainer, 2026-11-15)

iPhone 17 Pro, the maintainer's regular Bluetooth earbuds, pitch detection on. The microphone was set up the same way in every case (its own context, its silent output, the soft input request, the page's `play-and-record` type).

| Playback                                                                                         | Result                        |
| ------------------------------------------------------------------------------------------------ | ----------------------------- |
| Single track, media element on the browser's output                                              | thin after one to two seconds |
| Single track, media element routed through an `AudioContext` (after a pitch shift and back to 0) | still thin                    |
| The same single track with pitch detection off                                                   | clear                         |
| Composite track, Web Audio engine, no media element; also with its pitch changed                 | clear                         |

**A playing media element is the trigger while a microphone is open, whatever its sound then passes through. Playback from Web Audio alone is not affected.** The capture arrangement, the input choice and the session type are not the cause.

Seen on the way: the composite did not keep playing when the app went to the background (Decision 5, task 1.1).

## Goals / Non-Goals

**Goals**

- In the web app, while a microphone is open, tracks sound as they do without one, on Bluetooth earbuds included. Stage 1 covers pitch detection, stage 2 recording.
- Everything else about playing a track stays as it is: the queue, loops, markers, speed and pitch, lyrics, sheet music, the lock screen, and playback without a microphone.

**Non-Goals**

- Stereo while a microphone is open. The engine's prepared audio is mono; mono and full is accepted as the first step (maintainer, 2026-11-15). Stereo is a follow-up (`tasks.md`, F2).
- Background playback from the Web Audio engine. Playback without a microphone stays on the media element, which has it.
- Recording over a composite (`composite-recording-stems` keeps its own plan; stage 2 gives it the transport it lacked).
- A native audio path, and changes to how the microphone is captured.

## Decisions

### Decision 1: Two playback strategies, chosen by one rule: is a microphone open

- **No microphone open:** the media element, as today.
- **A microphone open** (pitch detection listening, or a take being recorded): the Web Audio engine that plays composites, with the track as its only stem.

Why keep the media element at all (the maintainer's question): it is the only one of the two that keeps playing in the background and on the lock screen on a phone, it starts at once from a stream with nothing to prepare or store, it is stereo, and its speed change is the browser's own. The engine has none of those today. Moving all playback to the engine would trade a problem that exists only with a microphone open for regressions in plain listening.

Why not a third split by platform: the rule applies on every web browser, not only on iPhone and iPad. One rule means the path that fixes the iPhone is the path CI's Chromium scenarios and the maintainer's Mac exercise every day, the page never has to guess the platform or the output route, and stage 2 needs one recording transport instead of two. The cost is mono playback and a preparing wait on desktop while a microphone is open, where nothing was wrong. That cost is accepted for the single rule; F2 (stereo) removes most of it.

Alternatives considered:

- _Route the element through an audio context._ Tried on the device; still thin (Findings 4).
- _Decode the whole track into memory._ A five-minute stereo track is over 100 MB of samples on a phone; the prepared store exists to avoid this.
- _Streamed decoding (WebCodecs) into Web Audio._ No preparing wait, but a new decode and scheduling path; the engine already has seek, loop wrap and shaping.
- _All playback through the engine._ See above.
- _Only on iPhone and iPad browsers._ Smaller blast radius, but a path CI never runs for real and two recording transports.

### Decision 2: A track on the engine is still that track

Only the transport changes. The playable item, its source and its owner stay the track, so markers, loops, lyrics, sheet music, recents, the waveform (the track's own peaks) and the media session need no new branch. Concretely:

- The active-engine registry (`composite/playback/active-composite.ts`) records what the engine is playing: a composite, or a single track. `getSavedTrackPlayer()`'s wrapper already sends transport calls to an active engine; it does so for both.
- Code that today reads "an engine is active" to mean "a composite is playing" asks for the kind instead: the Mix panel and stem options stay composite-only, and `use-practice-tools.ts` keeps hiding `Recording` for a composite only.
- The engine is built with one stem, gain 1, no offset. Speed and pitch go through the engine's rate and pitch stage (`wrapPitchShifterForComposite`), so the session's shaping carries over. The limiter stays in the path with nothing to limit.
- The engine modules move no further than needed: the single-track loader lives next to the playback controller (`library/playback/listening-engine/`), and reuses `createStemLoader`, the prepared store and `createWebCompositeEngine`. Names inside `composite/` that are now shared (the registry, the wrapper) are not renamed in this change.

### Decision 3: Prepared audio for single tracks is a budgeted cache

Preparing writes the track as mono 16-bit PCM at the context's rate: about 5.8 MB a minute at 48 kHz, 29 MB for a five-minute track. Composites are few and cleared by hand; single tracks are many, so their prepared audio needs a limit.

- Key: the prepared store's key is (composite id, stem id, content version). Single tracks use a reserved owner id (`track:<track id>`) and one stem id (`prepared-owner.ts`), so the same store, backend and reader serve them, and a changed Drive version prepares again. Each stored stem records when it was last prepared or played. The cleanup that removes prepared stems of deleted composites skips these owners.
- Size is a fixed function of length, not of the file: 2 bytes a sample, one channel, at the context's rate (`prepared-stem-store.ts`). At 48 kHz that is 5.76 MB a minute. The composite in the maintainer's recording has 2:45 stems, so 15.8 MB each; a five-minute track is 28.8 MB.
- Budget: 500 MB, fixed (`listening-audio-budget.ts`), least recently played removed first, never the track that is playing. That holds about 87 minutes: 31 tracks of 2:45 or 17 of five minutes, more than a rehearsal's worth. It is a cache: a removed track costs one more preparing wait, nothing else, so the default does not need to be exact. Shown in the offline files view as its own group (`Prepared for listening`) with its size and `Clear all`, next to `Prepared composites`. A stem prepared for a composite is not shared with the single-track entry in this change (the same audio may be stored twice; noted as F3).
- No room: the existing room check (`composite-room.ts`) and no-room state; the track then stays on the media element and the app says once that the sound may be thin on Bluetooth while it listens.
- Source of the bytes: `fetchTrackBlob` (the caches, the offline store, then Drive), as composites do. Offline with no stored copy: the track stays on the media element if that can play it, with the same message.

### Decision 4: Loading and hand-over

The controller decides per load and per microphone change; one module (`listening-engine/handover.ts`) owns the switch so there is a single place that can get position and state wrong.

- **A track loads while a microphone is open:** it loads straight onto the engine. Prepared already: it starts as a composite does. Not prepared: the player shows `Preparing for listening · first time only` with progress, then plays. The next item in the queue is prepared ahead while the current one plays.
- **A microphone opens during a track:** the element keeps playing while the track is prepared (progress in the monitor strip), then the switch happens at the element's position: engine seeks, starts, element pauses and is released. If playback was paused, the switch is silent. Until the switch the sound may be thin on an iPhone with Bluetooth; that is the state before this change, for a few seconds once per track.
- **The microphone closes during a track** (the last listener stops, or a take ends): the track goes back to the media element at the engine's position, in the same playing or paused state.
- **The app is hidden:** listening and recording already stop when the app is hidden (`app-visibility.ts`, the `hidden` stop reason), so the rule above hands the track back to the media element and playback continues in the background as today. The hand-back must start the element before the page is throttled; this is the riskiest step and is checked on the device (task 2.8).
- **Loop, speed and pitch across a switch:** the loop range, rate and semitones are applied to the incoming side before it starts.
- **A switch that fails** (decode error, storage error, the engine cannot start) leaves the track on the side it was on, playing, and reports once.

A gap of up to a few hundred milliseconds at a switch is acceptable; a restart, a position jump of more than that, or a stall is not.

### Decision 5: The engine does not play in the background; confirmed, and left as it is

Confirmed by the maintainer on the device with pitch detection off, with a screen recording (2026-11-15): a four-stem composite playing, the app sent to the home screen, the sound stops within about a second and is silent while the app is away, and playback picks up where it stopped on return. So it is how Web Audio playback behaves on the phone with no media element playing, not an effect of the microphone. The hand-back in Decision 4 is therefore needed. Background playback for composites themselves stays a follow-up (F1).

### Decision 6: Stage 2, recording over the engine's clock

Recording follows a `Transport` (`@org/audio-mixing`), today built over the media element (`recording-transport.web.ts`). A take opens the microphone, so by Decision 1 the track is on the engine for the whole take.

- **An engine transport:** `getPositionMs`, `isPlaying`, `hasEnded` and play, pause, seek and loop events from the engine's own subscription. `getRecordingTransport()` returns it whenever an engine is active for a single track.
- **Order at the start of a take:** the microphone opens, the track is handed to the engine (prepared first if needed, with the recorder's countdown held until the switch is done), then the take starts. A take never spans a hand-over: the transport is fixed from its first sample to its last.
- **Clock:** the anchor fit pairs capture times with track positions on `performance.now()` (rehearsal-recording design Decision 2). The engine's position comes from an audio context clock, mapped to `performance.now()` with the context's output timestamp, as the capture side already does. The engine exposes the position for a given context time so an anchor does not depend on when JavaScript ran.
- **Output latency:** Bluetooth output is some 150 to 300 ms late. The existing nudge, `Use for this device` and click calibration cover it; the click calibration is rechecked with the track on the engine, and the context's reported output latency is read as the starting value where the browser gives one.
- **Punch and the overlay voice:** both run against `Transport` and need no change beyond the new transport; reviewing a take has no microphone open and stays on the media element.
- **Recording over a composite** stays hidden (`composite-recording-stems`).

### Decision 7: Remove the "Sound while listening" setting; no standing notice

The setting's options cannot differ (Findings 1) and the cause is elsewhere. `audio-route-store`, the Settings control and the `AudioRoute` branches of the arbiter go; the arbiter keeps `playback` for the piano and `play-and-record` while capturing. With the fix in place there is no standing notice about Bluetooth; the only messages are the preparing state and the no-room or offline fallback of Decision 3.

## Risks / Trade-offs

- **The hand-back when the app is hidden may be too late** for the element to start. Mitigation: checked on the device early (task 2.8); fallback is to hand back on the first sign of hiding (`visibilitychange` to hidden, `pagehide`, and the app's own blur) or, failing that, to pause and say so.
- **Two paths for one track, switched mid-song.** Mitigation: one hand-over module with specs for position, state, loop and shaping, and browser scenarios for each switch.
- **Preparing wait and storage** for every track rehearsed with a microphone on. Mitigation: prepare ahead in the queue, the budget, and the existing no-room state.
- **The engine's speed and pitch sound a little different** from the element's (SoundTouch on the sum against the browser's time-stretch). Mitigation: listened for on the device at the common speeds; noted, not hidden.
- **Recording alignment moves to a different clock.** Mitigation: stage 2 is separate, with its own device check against the click calibration, and the element transport stays until stage 2 passes.
- **Mono on desktop while a microphone is open,** where nothing was wrong. Mitigation: F2.
- **CI cannot hear Bluetooth.** Scenarios assert the mechanism (no media element playing while a microphone is open; the engine's position continues across a switch; a take's audio aligns with the generated track). The device passes are the real checks, one per stage.

## Open Questions

None.
