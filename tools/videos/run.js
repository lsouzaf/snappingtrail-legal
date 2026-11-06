// npm run videos -- <video> [--lang en|pt]
//
// Builds the image if it is missing (Playwright's plus ffmpeg and espeak-ng, tools/videos/Dockerfile)
// and runs the pipeline inside it, with the capture settings' env file mounted read-only and
// everything printed masked — the same rules as the captures (tools/captures/run.js).

import {spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ENV_FILE, loadEnv, mask} from '../captures/lib/env.js';
import {STATE_DIR} from '../captures/lib/state.js';

const IMAGE = 'snappingtrail-docs-videos:1.64.1';
const HOME = '/videos-home';
const here = path.dirname(fileURLToPath(import.meta.url));

const env = loadEnv();
if (!env) {
  console.error(`Missing ${ENV_FILE} (DOCS_USER, DOCS_PASSWORD, DOCS_EN_URL, DOCS_PT_URL).`);
  process.exit(2);
}
const args = process.argv.slice(2);
if (!args[0]) {
  console.error('usage: npm run videos -- <video> [--lang en|pt]   (e.g. 01-overview)');
  process.exit(2);
}

let bin;
let argv;
let childEnv;
if (process.env.VIDEOS_INSIDE === '1') {
  [bin, argv, childEnv] = [process.execPath, ['pipeline.js', ...args], {...process.env, ...env}];
} else {
  if (spawnSync('docker', ['image', 'inspect', IMAGE], {stdio: 'ignore'}).status !== 0) {
    console.log(`Building ${IMAGE}…`);
    const built = spawnSync('docker', ['build', '-t', IMAGE, here], {stdio: 'inherit'});
    if (built.status !== 0) process.exit(built.status ?? 1);
  }
  const repo = path.resolve(here, '../..');
  fs.mkdirSync(STATE_DIR, {recursive: true});
  const {uid, gid} = os.userInfo();
  bin = 'docker';
  argv = [
    'run', '--rm', '--ipc=host', '--init',
    '--user', `${uid}:${gid}`,
    '-e', `HOME=${HOME}`, '-e', 'VIDEOS_INSIDE=1',
    '-v', `${ENV_FILE}:${HOME}/.config/snappingtrail/docs-captures.env:ro`,
    '-v', `${STATE_DIR}:${HOME}/.cache/snappingtrail/docs-captures`,
    '-v', `${repo}:/repo`,
    '-w', '/repo/tools/videos',
    IMAGE, 'node', 'run.js', ...args,
  ];
  childEnv = process.env;
}

const child = spawn(bin, argv, {env: childEnv, stdio: ['inherit', 'pipe', 'pipe']});
child.stdout.on('data', (chunk) => process.stdout.write(mask(String(chunk), env)));
child.stderr.on('data', (chunk) => process.stderr.write(mask(String(chunk), env)));
child.on('exit', (code) => process.exit(code ?? 1));
