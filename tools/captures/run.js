// Runs every capture script in Playwright's own Docker image (the browser, its system libraries
// and its fonts are the same on every machine, so are the screenshots). The credentials and the
// tenants' addresses come from the owner's env file, mounted read-only — never from the
// repository — and everything printed is masked, so no value of the file reaches the terminal or
// a log.

import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ENV_FILE, loadEnv, mask} from './lib/env.js';
import {STATE_DIR} from './lib/state.js';

const IMAGE = 'mcr.microsoft.com/playwright:v1.64.1-noble';
const HOME = '/captures-home';

const env = loadEnv();
if (!env) {
  console.error(`Missing ${ENV_FILE} (DOCS_USER, DOCS_PASSWORD, DOCS_EN_URL, DOCS_PT_URL).`);
  process.exit(2);
}

const args = process.argv.slice(2);
const inside = process.env.CAPTURES_INSIDE === '1';
let command;
if (inside) {
  command = [process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...args], {...process.env, ...env}];
} else {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  fs.mkdirSync(STATE_DIR, {recursive: true});
  const {uid, gid} = os.userInfo();
  command = [
    'docker',
    [
      'run', '--rm', '--ipc=host', '--init',
      '--user', `${uid}:${gid}`,
      '-e', `HOME=${HOME}`, '-e', 'CAPTURES_INSIDE=1',
      '-v', `${ENV_FILE}:${HOME}/.config/snappingtrail/docs-captures.env:ro`,
      '-v', `${STATE_DIR}:${HOME}/.cache/snappingtrail/docs-captures`,
      '-v', `${repo}:/repo`,
      '-w', '/repo/tools/captures',
      IMAGE, 'node', 'run.js', ...args,
    ],
    process.env,
  ];
}

const [bin, argv, childEnv] = command;
const child = spawn(bin, argv, {env: childEnv, stdio: ['inherit', 'pipe', 'pipe']});
child.stdout.on('data', (chunk) => process.stdout.write(mask(String(chunk), env)));
child.stderr.on('data', (chunk) => process.stderr.write(mask(String(chunk), env)));
child.on('exit', (code) => process.exit(code ?? 1));
