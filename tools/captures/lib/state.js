// Where the Keycloak sessions (storageState) and Playwright's own output live: outside the
// repository, in the user's cache.

import os from 'node:os';
import path from 'node:path';

export const STATE_DIR = path.join(os.homedir(), '.cache/snappingtrail/docs-captures');

export function statePath(lang) {
  return path.join(STATE_DIR, `${lang}.json`);
}
