// The Administration page (docs/administration.md): the list of users, the settings and the
// billing and plan section. Only screens are read: nothing is saved, created or deleted, and the
// test fails if any write leaves the browser. The users' emails are blurred in the image.

import {expect} from '@playwright/test';
import {open, signIn, test} from '../lib/capture.js';

const PAGE = 'administration';

/** The app's labels (completeSurvey i18n/translations.ts). */
const TEXT = {
  users: {en: 'User Management', pt: 'Gerenciamento de Usuários'},
  settings: {en: 'Settings', pt: 'Configurações'},
  notifications: {en: 'Email Notifications', pt: 'Notificações por E-mail'},
  billing: {en: 'Billing & Plan', pt: 'Cobrança & Plano'},
};

/** The users table's email column (the second), blurred. */
const USERS_CSS = `
main table td:nth-child(2) { filter: blur(8px) !important; }
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
  await page.locator('main h1, main h2').filter({hasText: title}).first().waitFor();
  await page.waitForLoadState('networkidle');
}

/** Brings [locator] to the top of the scrolled area, below the app's header. */
async function scrollToTop(locator) {
  await locator.evaluate((el) => {
    el.scrollIntoView({block: 'start'});
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.scrollHeight > p.clientHeight + 4 && getComputedStyle(p).overflowY !== 'visible') { p.scrollTop -= 24; break; }
    }
    window.scrollBy(0, -24);
  });
}

test('users', async ({page, lang, capture}) => {
  const writes = recordWrites(page);
  await openScreen(page, lang, '/users', TEXT.users[lang]);
  await page.locator('main table tbody tr').first().waitFor();
  await capture(PAGE, 'users', {css: USERS_CSS});
  expect(writes).toEqual([]);
});

test('settings', async ({page, lang, capture}) => {
  const writes = recordWrites(page);
  await openScreen(page, lang, '/settings', TEXT.settings[lang]);
  const notifications = page.locator('main').getByText(TEXT.notifications[lang], {exact: true}).first();
  await notifications.waitFor();
  await scrollToTop(notifications);
  await capture(PAGE, 'settings');
  expect(writes).toEqual([]);
});

test('billing', async ({page, lang, capture}) => {
  const writes = recordWrites(page);
  await openScreen(page, lang, '/settings', TEXT.settings[lang]);
  const heading = page.locator('main').getByText(TEXT.billing[lang], {exact: true}).first();
  await heading.waitFor();
  const section = heading.locator('xpath=ancestor::div[contains(@class, "rounded-3xl")][1]');
  await scrollToTop(section);
  await capture(PAGE, 'billing', {element: section});
  expect(writes).toEqual([]);
});
