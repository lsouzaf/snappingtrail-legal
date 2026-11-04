// The manual's screenshots: one Chromium at 1440×900 (scale 2), reduced motion, light scheme.
// Two tenants, one per language: "login-*" signs in once and keeps the Keycloak session (a
// storageState outside the repository); the capture scripts reuse it.

import {defineConfig} from '@playwright/test';
import {STATE_DIR, statePath} from './lib/state.js';

const tenant = {en: process.env.DOCS_EN_URL, pt: process.env.DOCS_PT_URL};
const browser = {
  viewport: {width: 1440, height: 900},
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
  colorScheme: 'light',
  timezoneId: 'UTC',
};
const language = {
  en: {lang: 'en', locale: 'en-US', baseURL: tenant.en},
  pt: {lang: 'pt', locale: 'pt-BR', baseURL: tenant.pt},
};

export default defineConfig({
  testDir: './scripts',
  outputDir: `${STATE_DIR}/test-results`,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  reporter: 'list',
  // Nothing recorded on failure: a trace or a screenshot of the sign-in page could hold the
  // credentials.
  use: {...browser, trace: 'off', screenshot: 'off', video: 'off'},
  projects: [
    {name: 'login-en', testMatch: /auth\.setup\.js/, use: language.en},
    {name: 'login-pt', testMatch: /auth\.setup\.js/, use: language.pt},
    {
      name: 'en',
      testMatch: /\.spec\.js/,
      dependencies: ['login-en'],
      use: {...language.en, storageState: statePath('en')},
    },
    {
      name: 'pt',
      testMatch: /\.spec\.js/,
      dependencies: ['login-pt'],
      use: {...language.pt, storageState: statePath('pt')},
    },
  ],
});
