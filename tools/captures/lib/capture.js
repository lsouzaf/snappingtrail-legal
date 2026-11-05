// What every capture script shares: the language of the run, the way in (the public page, or the
// app after the Keycloak sign-in), and the screenshot itself, made stable.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test as base} from '@playwright/test';

export {STATE_DIR, statePath} from './state.js';

/** The site's repository: the images go next to the manual's pages. */
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** The app's own labels (completeSurvey i18n/translations.ts). */
export const LABEL = {
  login: {en: 'Login', pt: 'Entrar'},
  createAccount: {en: 'Create Account', pt: 'Criar conta'},
};

/**
 * Hidden only while capturing: animations and the caret, the notifications dot, and dates
 * relative to the day of the run. A script hides more with capture(..., {hide: [selectors]}), or
 * adds its own rules with capture(..., {css}).
 */
const STABLE_CSS = `
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
button[aria-label="Notifications"] > span.absolute { display: none !important; }
`;

export const test = base.extend({
  lang: ['en', {option: true}],

  /**
   * capture(doc, step, {hide, css, page, element}) writes <page>-<step>-<lang>.png in the page's img
   * folder: the whole screen, or only [element] (a locator).
   */
  capture: async ({page: ownPage, lang}, use) => {
    await use(async (doc, step, {hide = [], css = '', page = ownPage, element = null} = {}) => {
      const hidden = hide.map((selector) => `${selector} { visibility: hidden !important; }`).join('\n');
      await page.addStyleTag({content: `${STABLE_CSS}\n${hidden}\n${css}`});
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(imgDir(doc, lang), `${path.basename(doc)}-${step}-${lang}.png`);
      fs.mkdirSync(path.dirname(file), {recursive: true});
      // With an element, only that part of the screen (e.g. one card).
      const target = element ?? page;
      await target.screenshot({path: file, animations: 'disabled', caret: 'hide'});
    });
  },
});

/** The img folder next to a page of the manual (doc is its id, e.g. "collect-app/offline"). */
function imgDir(doc, lang) {
  const root = lang === 'en' ? 'docs' : 'i18n/pt/docusaurus-plugin-content-docs/current';
  return path.join(REPO, root, path.dirname(doc), 'img');
}

/** Opens a path of the app in the run's language, and waits for the network to settle. */
export async function open(page, lang, pathname) {
  const separator = pathname.includes('?') ? '&' : '?';
  await page.goto(`${pathname}${separator}lang=${lang}`);
  await page.waitForLoadState('networkidle');
}

/** A visible button by its exact label (the public header has a mobile copy of each). */
export function button(page, label) {
  return page.getByRole('button', {name: label, exact: true}).filter({visible: true}).first();
}

/**
 * Signs in through the tenant's Keycloak: with the kept session it comes straight back; without
 * one, it fills in the form (the theme may put it in a frame, so it is found by its fields). Done
 * when the app's menu shows.
 */
export async function signIn(
  page,
  lang,
  {user = process.env.DOCS_USER, password = process.env.DOCS_PASSWORD, ready = 'a[href="/settings"]'} = {},
) {
  await open(page, lang, '/');
  await button(page, LABEL.login[lang]).click();
  const menu = page.locator(ready);
  const deadline = Date.now() + 45_000;
  let form = null;
  while (!form && !(await menu.isVisible())) {
    if (Date.now() > deadline) throw new Error('Neither the sign-in form nor the app came up');
    form = await signInFrame(page);
    if (!form) await page.waitForTimeout(500);
  }
  if (form) {
    await form.locator('input[type="email"], input[name="username"]').first().fill(user);
    await form.locator('input[type="password"]').fill(password);
    await form.locator('button[type="submit"], input[type="submit"]').first().click();
  }
  await menu.waitFor({timeout: 45_000});
  await page.waitForLoadState('networkidle');
}

/** The frame (the page itself or an iframe) that holds the sign-in form, if one is showing. */
async function signInFrame(page) {
  for (const frame of page.frames()) {
    if (await frame.locator('input[type="password"]').isVisible().catch(() => false)) return frame;
  }
  return null;
}
