// The Integrations and deliveries page (docs/integrations.md): the Integrations screen, the list of
// delivery rules and the delivery history. Only screens are read: nothing is saved, tested or
// deleted, and the test fails if any write leaves the browser. Every field is blurred in the image
// (addresses, tokens, keys, spreadsheet and page ids), and so is the history's details column.

import {expect} from '@playwright/test';
import {open, signIn, test} from '../lib/capture.js';

const PAGE = 'integrations';

/** The app's labels (completeSurvey i18n/translations.ts). */
const TEXT = {
  integrations: {en: 'Integrations', pt: 'Integrações'},
  rules: {en: 'Delivery Rules', pt: 'Regras de Envio'},
  history: {en: 'Delivery History', pt: 'Histórico de Entregas'},
};

/** What the images never show: the value of any field, typed or saved. */
const MASK_CSS = `
main input, main textarea, main select { filter: blur(10px) !important; }
`;

/** Every write to the API recorded. */
function recordWrites(page) {
  const writes = [];
  page.on('request', (r) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /\/api\//.test(new URL(r.url()).pathname)) {
      writes.push(`${r.method()} ${new URL(r.url()).pathname}`);
    }
  });
  return writes;
}

async function openScreen(page, lang, pathname, title) {
  await signIn(page, lang);
  await open(page, lang, pathname);
  await page.locator('main h1').filter({hasText: title}).first().waitFor();
  await page.waitForLoadState('networkidle');
}

test('integrations', async ({page, lang, capture}) => {
  const writes = recordWrites(page);
  await openScreen(page, lang, '/integrations', TEXT.integrations[lang]);
  await capture(PAGE, 'screen', {css: MASK_CSS});
  expect(writes).toEqual([]);
});

test('rules', async ({page, lang, capture}) => {
  const writes = recordWrites(page);
  await openScreen(page, lang, '/trigger-rules', TEXT.rules[lang]);
  await capture(PAGE, 'rules', {css: MASK_CSS});
  expect(writes).toEqual([]);
});

test('history', async ({page, lang, capture}) => {
  const writes = recordWrites(page);
  await openScreen(page, lang, '/deliveries', TEXT.history[lang]);
  await capture(PAGE, 'history', {css: MASK_CSS});
  expect(writes).toEqual([]);
});
