# The manual's screenshots

Playwright opens the DEV tenants (one per language) and writes the manual's images next to its
pages: `docs/**/img/<page>-<step>-en.png` and
`i18n/pt/docusaurus-plugin-content-docs/current/**/img/<page>-<step>-pt.png`. The site's build and
deploy do not use this folder.

## Before the first run

- Docker, and the image the captures run in (the same browser, libraries and fonts on every
  machine): `docker pull mcr.microsoft.com/playwright:v1.64.1-noble`.
- `npm ci` in this folder.
- `~/.config/snappingtrail/docs-captures.env` (mode 600), outside the repository, with
  `DOCS_USER`, `DOCS_PASSWORD`, `DOCS_EN_URL` (the English tenant) and `DOCS_PT_URL` (the
  Portuguese one). The same user signs in to both.

## Run

```
npm run captures                          # every page, both languages
npm run captures -- --project=en          # English only
npm run captures -- scripts/getting-started.spec.js
```

The first step signs in through each tenant's Keycloak and keeps the session in
`~/.cache/snappingtrail/docs-captures/` (never in the repository); the scripts reuse it. Nothing
the env file holds is printed: the output is masked, and no trace, video or failure screenshot is
recorded.

## Writing a page's script

One file per page of the manual, `scripts/<page>.spec.js`, one test per step:

```js
test('projects', async ({page, lang, capture}) => {
  await signIn(page, lang);
  await open(page, lang, '/projects');
  await capture('getting-started', 'projects');   // getting-started-projects-<lang>.png
});
```

The screenshots are 1440×900 at scale 2, with reduced motion, the language from `?lang=`, the
network idle, and what changes from run to run (the notifications dot, animations) hidden by CSS
injected only for the capture; `capture(..., {hide: [selectors]})` hides more. Only screens are
read: a script never creates, edits or deletes data.
