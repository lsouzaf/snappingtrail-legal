# The manual's videos

A video is a script: `scripts/<video>.yml`. One command records it from the DEV tenants (English on
`DOCS_EN_URL`, Portuguese on `DOCS_PT_URL`), adds the narration and assembles it, so a change in the
product is only a new run:

```
npm ci                          # once, in this folder
npm run videos -- 01-overview   # both languages
npm run videos -- 01-overview --lang pt
npm run videos -- 03-creating-a-survey --lang en --scene 08-publish   # one scene, to try it out
```

The scripts: `01-overview` (what Snapping Trail is), `02-getting-started`, `03-creating-a-survey`,
`04-collecting-by-link`, `05-collect-app`, `06-results`, `07-integrations` and `08-administration`.

Out come `out/01-overview-en.mp4` and `out/01-overview-pt.mp4` (1920×1080, 30 fps), each with its
subtitles (`.srt`). `out/` stays out of git, and so does the work folder inside it (frames, cards,
provisional voice, segments).

## Where it runs

In Docker, like the captures: Playwright's image plus ffmpeg and espeak-ng (`Dockerfile`), built by
`run.js` the first time (`snappingtrail-docs-videos:1.64.1`). The host installs nothing. The same
rules as the captures hold: the credentials come from `~/.config/snappingtrail/docs-captures.env`,
mounted read-only and masked in everything printed; the session is the captures' own (and the demo
interviewer's, `DOCS_INTERVIEWER_USER`); any request to the API other than a read fails the scene,
unless the script answers it in the browser with a simulated result (`fake`), so it never leaves;
share links are masked, QR codes and the texts the script names (emails, prices, billing dates)
blurred.

## The script

```yaml
id: 01-overview
title: {en: What Snapping Trail is, pt: O que é o Snapping Trail}
scenes:
  - id: 03-fitplus            # also the name of the scene's narration file
    minDuration: 12           # seconds; the scene lasts the longer of this and its narration
    narration: {en: "…", pt: "…"}
    screen:
      app:
        path: /projects       # in the language's tenant; signedIn: false for the public pages
        setup: [...]          # steps off camera, at full speed
        mask: [shareLinks, qrCode, fields]
        insightsMode: true    # the app's insights mode, as the captures set it
        css: "…"              # extra CSS while recording
        blurText: ['@']       # regular expressions: every element whose text matches is blurred
        user: interviewer     # the demo interviewer's session instead of the administrator's
        respondent: {setup}   # no session: the survey's share link, read in its Share tab by setup
        fake:                 # writes answered in the browser, never sent (the scene shows them done)
          - {method: POST, path: "^/api/onboarding$", status: 200, body: {}}
          - {method: PUT, path: "^/api/surveys/[^/]+$", body: echo}         # the request's own JSON
          - {method: GET, path: "…", afterWrite: true, patch: {status: ACTIVE}, omit: [questions]}
      actions: [...]          # steps on camera, smooth, with the cursor
```

A `fake` GET is read for real and changed in the browser (`patch` over it, `omit` left out), with
`afterWrite` only once a write was simulated, so the screen agrees with what the scene did. A write
the script does not answer is refused and fails the scene. `setup` and `actions` can join the
steps of several YAML anchors (`setup: [*openBuilder, *textQuestion]`).

A screen is one of:

- `app`: a screen of the app, with `setup` and `actions`.
- `images`: images one after the other with a cross-fade (the Collect app's captures, the Slack
  message); `{docs}` is the language's docs folder, `{assets}` this folder's `assets` and `{lang}`
  the language.
  An image can also be `{file, cover: {x, y, w, h, color}}`: the video uses a copy with that box
  filled (a negative `x` or `y` counts from the right or bottom), and the original stays as it is.
- `card`: `opening` (logo and title) or `closing` (logo, the manual's address and its line).

A scene can also have `parts`, each a screen with its `share` of the scene's time (scene 10: the
Reports tab, then the Slack message).

Steps: `wait: 2`, `goto: /path`, `waitFor: target`, `click: target`, `glide: target` (moves the
cursor), `scroll: {by: 1200, duration: 6}`, `scrollTo: target`, `highlight: target` (a ring around
it), `zoom: target` (with `scale`, 2 by default; the target is centred, and one that would not fit
the frame whole fails the scene), `style: {…target, set}` (inline styles, in a setup),
`type: {…target, value}` (typed key by key on camera, `delay` in ms), `fill: {…target, value}` (a
date or a number, at once), `select: {…target, value}`, `press: Escape`, `attr: {…target, name}`
(for a mask's CSS to find it) and `waitUrl: "/collect"`. A target is found by `role` (with `text` as
its name), `testid`, `css` or `text`, inside `within`, filtered by `hasText`; `exact`, `nth`,
`visible`, `parent` (its parent element), `card` (the insight card around it) and `closest` (the
nearest ancestor with that class) refine it, and `duration` sets the time of the movement. Texts
and CSS are either one string or `{en, pt}`.

## The narration: ElevenLabs

Each scene's narration is one file per language, `voice/<video>/<lang>/<scene id>.mp3` (`.wav` and
`.m4a` also work). A scene without one gets a provisional voice, espeak-ng — robotic, there only to
set the timing — and the run says how many still do. The mp3 files are generated, not versioned.

### Generating it

```sh
npm run voice -- 01-overview                              # every scene, both languages
npm run voice -- 01-overview --lang pt                    # one language
npm run voice -- 01-overview --lang pt --scene 07-insights --force   # make one scene again
npm run videos -- 01-overview                             # then the video, with the new voice
```

`npm run voice` runs on the host (Node 20.12 or later, no Docker). It reads the API key and the two
voices from `~/.config/snappingtrail/videos.env`, outside the repository:

```
ELEVENLABS_API_KEY=…
ELEVENLABS_VOICE_ID_PT=…
ELEVENLABS_VOICE_ID_EN=…
```

Never read that file with `cat` nor print its values; the command masks them in anything it shows.
Without the file, it stops and says so.

- It sends each scene's text to ElevenLabs' text-to-speech API with the multilingual model
  (`eleven_multilingual_v2`), in the language's voice. That model works out the language from the
  text and refuses a language in the call; the models that take one (`eleven_turbo_v2_5`,
  `eleven_flash_v2_5`) get it as `language_code`.
- Before sending anything, it shows how many characters it will send, per language and in total,
  and asks; `--yes` skips the question.
- A scene that already has its mp3 is left alone; `--force` makes it again (with `--scene`, just
  that one).
- At the end it shows the characters the API charged, and the account's usage before and after.
  On an API error it stops with the status: the scenes already made stay, and a new run makes the
  rest.

### Fixing a word's pronunciation

The voice reads the scene's `narration`, the same text as the subtitles. When a word comes out
wrong, give the voice its own text with `voiceText`, a string or `{en, pt}` (either may be left
out); the subtitles keep `narration`:

```yaml
narration:
  en: Snapping Trail speaks your language.
  pt: O Snapping Trail fala a sua língua.
voiceText:
  pt: O Snépping Treil fala a sua língua.
```

Then make that scene again: `npm run voice -- <video> --lang pt --scene <id> --force`.

### Checking it

Listen to the mp3 files in `voice/<video>/<lang>/`, then make the video: each scene's length
follows its narration (0.4 s before it, 0.8 s after it, never less than `minDuration`), and the run
prints each scene's length. Look at a frame of each scene in `out/` before publishing. A scene
whose screen ends long before the voice, or the other way round, needs its actions or its
`minDuration` adjusted. `npm test` checks the command against a simulated API: nothing leaves.

## The YouTube packages

```sh
npm run youtube                          # every video, both languages
npm run youtube -- 04-collecting-by-link --lang pt
```

From the videos already made, `out/youtube/<video>-<lang>/` gets the mp4 and the srt, a 1280×720
`thumbnail.png` (the opening card's look: the logo, the name and the video's title) and
`youtube.txt`: the title, the description and the tags, ready to paste. It runs in the videos'
image, like `npm run videos`, and reads nothing from DEV.

- Each script's `youtube` block holds the YouTube title, the description's sentence, the manual's
  page (`""` for the manual's root) and the tags added to the common ones.
- A scene that starts a chapter carries `chapter: {en, pt}`; the scenes after it belong to it, the
  opening card belongs to the first and the closing to the last. The times come from the real
  length of each scene in that language (`out/work/<video>/<lang>/<scene>.mp4`).
- YouTube's rules are checked: the first chapter at 0:00, at least three, each 10 s or longer. A
  short chapter stops the package with its name: merge it into its neighbour by moving `chapter`.
- After making a video again, make its package again: the chapters follow the new lengths.
