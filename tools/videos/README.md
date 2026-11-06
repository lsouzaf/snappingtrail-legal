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

## The narration: from the provisional voice to ElevenLabs

Each scene's narration is one file per language. Until the final voice exists, espeak-ng reads the
script's text — a robotic voice, there only to set the timing. To use ElevenLabs:

1. Generate each scene's narration from the script's text, in each language.
2. Save it as `voice/<video>/<lang>/<scene id>.mp3` (`.wav` and `.m4a` also work), for example
   `voice/01-overview/pt/07-insights.mp3`.
3. Run `npm run videos -- 01-overview` again.

A scene with its file in `voice/` uses it; a scene without one keeps the provisional voice, and the
run says how many still do. The scene's length follows the new narration (0.4 s before it, 0.8 s
after it, never less than `minDuration`), and so do the subtitles, which always come from the
script's text: change the text in the script and in the audio together.
