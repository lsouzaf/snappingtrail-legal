// Signs in to the tenant of the run's language once and keeps the Keycloak session.

import {signIn, statePath, test} from '../lib/capture.js';

test('sign in', async ({page, lang}) => {
  await signIn(page, lang);
  await page.context().storageState({path: statePath(lang)});
});
