// The Collection page (docs/collection.md): the survey's share link and its QR code, the survey as
// the respondent sees it through the link, and the interviewer's My Surveys. Only screens are read.
//
// - The link's address shows the DEV tenant and the link's token: it is replaced, on screen only,
//   by a masked one, and the QR code (which encodes it) is blurred.
// - Opening the link starts a session right away (completeSurvey views/PublicSurvey.tsx, POST
//   /public/interviews). Here that request never leaves the browser: it is answered with a made-up
//   id, every other write to the API is aborted, and the test fails if any write went out.

import {expect} from '@playwright/test';
import {open, signIn, test} from '../lib/capture.js';

const PAGE = 'collection';

/** The app's labels (completeSurvey i18n/translations.ts) and the FitPlus demo data. */
const TEXT = {
  project: {en: 'FitPlus demo', pt: 'Demonstração FitPlus'},
  surveysTab: {en: 'Surveys', pt: 'Pesquisas'},
  survey: {en: 'FitPlus satisfaction survey', pt: 'Pesquisa de satisfação FitPlus'},
  shareTab: {en: 'Share', pt: 'Compartilhar'},
  copyLink: {en: 'Copy link', pt: 'Copiar link'},
  qrTitle: {en: 'QR Code', pt: 'QR Code'},
  qrDownload: {en: 'Download PNG', pt: 'Baixar PNG'},
  mySurveys: {en: 'My Surveys', pt: 'Minhas Pesquisas'},
};

const MASKED_URL = (lang) => `https://yourcompany.app.snappingtrail.com/s/••••••••?lang=${lang}`;
const BLUR_QR = 'img[alt="QR Code"] { filter: blur(14px) !important; }';

/** The FitPlus survey, on its Share tab, with its link's row on screen. */
async function openShare(page, lang) {
  await signIn(page, lang);
  await open(page, lang, '/projects');
  const main = page.locator('main');
  await main.getByRole('button').filter({hasText: TEXT.project[lang]}).first().click();
  await main.getByRole('button', {name: TEXT.surveysTab[lang]}).click();
  await main.getByText(TEXT.survey[lang], {exact: true}).click();
  await main.getByRole('button', {name: TEXT.shareTab[lang]}).first().click();
  await main.getByRole('button', {name: TEXT.copyLink[lang]}).first().waitFor();
  await page.waitForLoadState('networkidle');
}

/** The link's address as the app shows it (read before it is masked). */
async function linkAddress(page) {
  const address = page.locator('main div.font-mono').filter({hasText: '/s/'}).first();
  return (await address.textContent()).trim();
}

/** Replaces, on screen only, every link address by the masked one. */
async function maskAddresses(page, lang) {
  await page.evaluate((masked) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (/https?:\/\/\S*\/s\//.test(node.textContent)) node.textContent = masked;
    }
    for (const el of document.querySelectorAll('input')) {
      if (el.value.includes('/s/')) el.value = masked;
    }
  }, MASKED_URL(lang));
  // Nothing on screen may still carry the link's address.
  await expect(page.locator('body')).not.toContainText(/\/s\/[A-Za-z0-9_-]{6,}/);
}

test('share', async ({page, lang, capture}) => {
  await openShare(page, lang);
  await maskAddresses(page, lang);
  await capture(PAGE, 'share');
});

test('qr', async ({page, lang, capture}) => {
  await openShare(page, lang);
  await page.locator('main').getByRole('button', {name: TEXT.qrTitle[lang]}).first().click();
  await page.getByRole('link', {name: TEXT.qrDownload[lang]}).waitFor();
  await page.locator('img[alt="QR Code"]').first().waitFor();
  await maskAddresses(page, lang);
  await capture(PAGE, 'qr', {css: BLUR_QR});
});

test('respondent', async ({page, lang, capture, browser}) => {
  await openShare(page, lang);
  const path = new URL(await linkAddress(page)).pathname;
  const base = new URL(page.url()).origin;

  // A respondent: a browser with no session at all.
  const context = await browser.newContext({
    viewport: {width: 1440, height: 900},
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    colorScheme: 'light',
    timezoneId: 'UTC',
    locale: lang === 'pt' ? 'pt-BR' : 'en-US',
  });
  const respondent = await context.newPage();
  const writes = [];
  await respondent.route('**/*', async (route) => {
    const request = route.request();
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method());
    if (write && /\/public\/interviews\/?$/.test(new URL(request.url()).pathname)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({interviewId: '00000000-0000-0000-0000-000000000000'}),
      });
      return;
    }
    if (write) {
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
      await route.abort();
      return;
    }
    await route.continue();
  });

  await respondent.goto(`${base}${path}?lang=${lang}`);
  await respondent.waitForLoadState('networkidle');
  await respondent.locator('button').first().waitFor();
  await capture(PAGE, 'respondent', {page: respondent});
  await context.close();

  expect(writes, 'no write may leave the respondent page').toEqual([]);
});

test.describe('interviewer', () => {
  test.use({storageState: {cookies: [], origins: []}});

  test('my surveys', async ({page, lang, capture}) => {
    test.skip(!process.env.DOCS_INTERVIEWER_USER, 'no interviewer in the env file');
    await signIn(page, lang, {
      user: process.env.DOCS_INTERVIEWER_USER,
      password: process.env.DOCS_INTERVIEWER_PASSWORD,
      ready: 'a[href="/collect"]',
    });
    // The app brings an interviewer to /collect on its own. Loaded directly, /collect answers 403
    // on DEV: nginx finds the public/collect folder before the app (completeSurvey nginx.conf).
    await page.waitForURL(/\/collect(\?|$)/);
    await page.locator('main').getByText(TEXT.survey[lang]).first().waitFor();
    await capture(PAGE, 'my-surveys');
  });
});

