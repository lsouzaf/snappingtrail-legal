// The Results page (docs/results.md): the FitPlus survey's Analytics tab at its answer cards, the
// FitPlus objective's Insights tab, one finding with its strength, and the survey's reports. Only
// screens are read: insights mode is a browser setting (localStorage), and no report is downloaded
// (a download is a request that builds the file); the test fails if any write leaves the browser.

import {expect} from '@playwright/test';
import {open, signIn, test} from '../lib/capture.js';

const PAGE = 'results';

/** The app's labels (completeSurvey i18n/translations.ts) and the FitPlus demo data. */
const TEXT = {
  project: {en: 'FitPlus demo', pt: 'Demonstração FitPlus'},
  surveysTab: {en: 'Surveys', pt: 'Pesquisas'},
  survey: {en: 'FitPlus satisfaction survey', pt: 'Pesquisa de satisfação FitPlus'},
  analyticsTab: {en: 'Analytics', pt: 'Analytics'},
  reportsTab: {en: 'Reports', pt: 'Relatórios'},
  answerCards: {en: 'Detailed question analysis', pt: 'Análise detalhada por pergunta'},
  objective: {en: 'FitPlus member retention', pt: 'Retenção de alunos da FitPlus'},
  insightsTab: {en: 'Insights', pt: 'Insights'},
  firm: {en: 'Firm', pt: 'Firme'},
  availableReports: {en: 'Available reports', pt: 'Relatórios disponíveis'},
  executiveSummary: {en: 'Executive summary', pt: 'Resumo executivo'},
};

/** Insights mode on (the app keeps it in localStorage), and every write to the API recorded. */
async function readOnly(page) {
  const writes = [];
  page.on('request', (r) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /\/api\//.test(new URL(r.url()).pathname)) {
      writes.push(`${r.method()} ${new URL(r.url()).pathname}`);
    }
  });
  await page.addInitScript(() => localStorage.setItem('researchpro_mode', 'advanced'));
  return writes;
}

async function openSurveyTab(page, lang, tab) {
  await signIn(page, lang);
  await open(page, lang, '/projects');
  const main = page.locator('main');
  await main.getByRole('button').filter({hasText: TEXT.project[lang]}).first().click();
  await main.getByRole('button', {name: TEXT.surveysTab[lang]}).click();
  await main.getByText(TEXT.survey[lang], {exact: true}).click();
  await main.getByRole('button', {name: tab}).first().click();
  await page.waitForLoadState('networkidle');
}

async function openInsights(page, lang) {
  await signIn(page, lang);
  await open(page, lang, '/objectives');
  await page.locator('main').getByText(TEXT.objective[lang], {exact: true}).first().click();
  await page.locator('main').getByRole('button', {name: TEXT.insightsTab[lang], exact: true}).first().click();
  await page.locator('[data-testid="insight-strip"]').first().waitFor();
  await page.waitForLoadState('networkidle');
}

/** Brings [locator] to the top of the scrolled area, below the app's header. */
async function scrollToTop(page, locator) {
  await locator.evaluate((el) => {
    el.scrollIntoView({block: 'start'});
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.scrollHeight > p.clientHeight + 4 && getComputedStyle(p).overflowY !== 'visible') { p.scrollTop -= 24; break; }
    }
    window.scrollBy(0, -24);
  });
}

test('analytics', async ({page, lang, capture}) => {
  const writes = await readOnly(page);
  await openSurveyTab(page, lang, TEXT.analyticsTab[lang]);
  const cards = page.locator('main').getByText(TEXT.answerCards[lang], {exact: true});
  await cards.waitFor();
  await page.waitForLoadState('networkidle');
  await scrollToTop(page, cards);
  await capture(PAGE, 'analytics');
  expect(writes).toEqual([]);
});

test('insights', async ({page, lang, capture}) => {
  const writes = await readOnly(page);
  await openInsights(page, lang);
  await scrollToTop(page, page.locator('[data-testid="insight-strip"]').first());
  await capture(PAGE, 'insights');
  expect(writes).toEqual([]);
});

test('finding', async ({page, lang, capture}) => {
  const writes = await readOnly(page);
  await openInsights(page, lang);
  // The first finding (a firm segment difference): its card alone, the strength chip in view.
  const card = page.locator('[data-testid="insight-strip"]').first().locator('xpath=..');
  await expect(card.getByText(TEXT.firm[lang], {exact: true})).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await capture(PAGE, 'finding', {element: card});
  expect(writes).toEqual([]);
});

test('reports', async ({page, lang, capture}) => {
  const writes = await readOnly(page);
  await openSurveyTab(page, lang, TEXT.reportsTab[lang]);
  const list = page.locator('main').getByText(TEXT.availableReports[lang], {exact: true});
  await list.waitFor();
  // The list loads after the heading: wait for a report's title, not the loading skeleton.
  await page.locator('main').getByText(TEXT.executiveSummary[lang], {exact: true}).first().waitFor();
  await page.waitForLoadState('networkidle');
  await scrollToTop(page, list);
  await capture(PAGE, 'reports');
  expect(writes).toEqual([]);
});
