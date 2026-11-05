// The Surveys page (docs/surveys.md): the surveys of the FitPlus project, the survey builder and a
// choice question. The FitPlus survey is active, so the builder shows it read-only; it has no
// follow-up question, and the question catalog is empty on DEV, so neither is captured.

import {open, signIn, test} from '../lib/capture.js';

const PAGE = 'surveys';

/** The app's labels (completeSurvey i18n/translations.ts) and the FitPlus demo data. */
const TEXT = {
  project: {en: 'FitPlus demo', pt: 'Demonstração FitPlus'},
  surveysTab: {en: 'Surveys', pt: 'Pesquisas'},
  survey: {en: 'FitPlus satisfaction survey', pt: 'Pesquisa de satisfação FitPlus'},
  questionsTab: {en: 'Questions', pt: 'Perguntas'},
  choiceQuestion: {en: 'Overall satisfaction', pt: 'Satisfação geral'},
};

/** The FitPlus project, on its Surveys tab. */
async function openSurveys(page, lang) {
  await signIn(page, lang);
  await open(page, lang, '/projects');
  const main = page.locator('main');
  await main.getByRole('button').filter({hasText: TEXT.project[lang]}).first().click();
  await main.getByRole('button', {name: TEXT.surveysTab[lang]}).click();
  await main.getByText(TEXT.survey[lang], {exact: true}).waitFor();
  await page.waitForLoadState('networkidle');
}

/** The FitPlus survey, on its Questions tab (the builder). */
async function openBuilder(page, lang) {
  await openSurveys(page, lang);
  const main = page.locator('main');
  await main.getByText(TEXT.survey[lang], {exact: true}).click();
  await main.getByRole('button', {name: TEXT.questionsTab[lang]}).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => document.querySelectorAll('main input, main textarea').length > 5);
}

test('list', async ({page, lang, capture}) => {
  await openSurveys(page, lang);
  await capture(PAGE, 'list');
});

test('builder', async ({page, lang, capture}) => {
  await openBuilder(page, lang);
  await capture(PAGE, 'builder');
});

test('choice', async ({page, lang, capture}) => {
  await openBuilder(page, lang);
  // The question's text is an input's value, so it is found by value, then brought to the top.
  await page.evaluate((text) => {
    const input = [...document.querySelectorAll('main input, main textarea')].find((e) => e.value === text);
    if (!input) throw new Error(`Question not found: ${text}`);
    input.scrollIntoView({block: 'start'});
    window.scrollBy(0, -140);
    for (let el = input.parentElement; el; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== 'visible') {
        el.scrollTop -= 140;
        break;
      }
    }
  }, TEXT.choiceQuestion[lang]);
  await capture(PAGE, 'choice');
});
