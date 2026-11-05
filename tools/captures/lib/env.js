// The capture settings live outside the repository, in the owner's env file. They are read here
// and handed to Playwright through the environment, and masked in anything printed.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const ENV_FILE = path.join(os.homedir(), '.config/snappingtrail/docs-captures.env');
export const KEYS = ['DOCS_USER', 'DOCS_PASSWORD', 'DOCS_EN_URL', 'DOCS_PT_URL'];

/** The interviewer's sign-in, for the screens only an interviewer sees: optional. */
export const OPTIONAL_KEYS = ['DOCS_INTERVIEWER_USER', 'DOCS_INTERVIEWER_PASSWORD'];

/** The four settings (and the optional ones present), or null when the file or one of the four is missing. */
export function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return null;
  const parsed = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) parsed[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  if (!KEYS.every((key) => parsed[key])) return null;
  return Object.fromEntries([...KEYS, ...OPTIONAL_KEYS].filter((key) => parsed[key]).map((key) => [key, parsed[key]]));
}

/** The text with every setting's value replaced by its name. */
export function mask(text, env) {
  let out = text;
  for (const key of [...KEYS, ...OPTIONAL_KEYS]) {
    const value = env[key];
    if (!value) continue;
    out = out.split(value).join(`<${key}>`);
    // The addresses also show up without their scheme or trailing slash.
    if (key.endsWith('_URL')) {
      const host = value.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      out = out.split(host).join(`<${key}>`);
    }
  }
  return out;
}
