# SnappingTrail docs

The [docs.snappingtrail.com](https://docs.snappingtrail.com) site, built with
[Docusaurus](https://docusaurus.io/) and deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.

- The manual: `docs/` (English, at `/manual/`) and
  `i18n/pt/docusaurus-plugin-content-docs/current/` (Portuguese, at `/pt/manual/`).
- The pages that keep their old addresses: `legacy/` — the root index, the privacy policy of
  [SnappingTrail Collect](https://play.google.com/store/apps/details?id=com.snappingtrail.collect)
  (`/en/`, `/pt/`) and the `/en/manual/` redirect. `plugins/legacy-pages.js` copies them into the
  root of the build.
- `static/CNAME`: the custom domain.

## Working on it

```
nvm use
npm ci
npm start            # English, live reload
npm run start:pt     # Portuguese
npm run build && npm run check-urls
npm run serve        # the build, with the search
```

The search (`@easyops-cn/docusaurus-search-local`) is built with the site: it works on
`npm run build` / `npm run serve`, not on `npm start`.
