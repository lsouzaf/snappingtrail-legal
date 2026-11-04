// @ts-check
// The pages that keep their addresses from before the Docusaurus site: the root index, the Collect
// privacy policies (/en/, /pt/) and the /en/manual/ redirect. They live in legacy/, not static/,
// because Docusaurus copies static/ into every locale's build (it would give /pt/en/, /pt/pt/):
// they are copied into the build of the locale they sit under: legacy/pt/ into /pt/ (the Portuguese
// build, made after the default one, replaces that folder), everything else into the root.
//
// static/ is copied into every locale's build on purpose (a Portuguese page asks for
// /pt/img/...), except the CNAME: the site has one, at the root, and the copy inside a locale's
// build (/pt/CNAME) is removed.

import fs from 'node:fs/promises';
import path from 'node:path';

/** @type {import('@docusaurus/types').PluginModule} */
export default function legacyPages(context) {
  return {
    name: 'legacy-pages',
    async postBuild({outDir}) {
      const {currentLocale, defaultLocale} = context.i18n;
      const legacy = path.join(context.siteDir, 'legacy');
      if (currentLocale === defaultLocale) {
        await fs.cp(legacy, outDir, {recursive: true});
        return;
      }
      const ownPages = path.join(legacy, currentLocale);
      if (await exists(ownPages)) await fs.cp(ownPages, outDir, {recursive: true});
      await fs.rm(path.join(outDir, 'CNAME'), {force: true});
    },
  };
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
