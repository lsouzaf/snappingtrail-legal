// The Getting started page (docs/getting-started.md): the sign-up form and the projects screen.

import {LABEL, button, open, signIn, test} from '../lib/capture.js';

const PAGE = 'getting-started';

test.describe('public page', () => {
  test.use({storageState: {cookies: [], origins: []}});

  test('signup', async ({page, lang, capture}) => {
    await open(page, lang, '/');
    await button(page, LABEL.createAccount[lang]).click();
    await page.locator('form input[type="email"]').waitFor();
    // Behind the form, the public page moves on every run: the backdrop goes opaque.
    await capture(PAGE, 'signup', {
      css: '.fixed.inset-0.backdrop-blur-sm { background: rgb(15 23 42) !important; backdrop-filter: none !important; }',
    });
  });
});

test('projects', async ({page, lang, capture}) => {
  await signIn(page, lang);
  await open(page, lang, '/projects');
  await page.locator('main').getByRole('heading').first().waitFor();
  await capture(PAGE, 'projects');
});
