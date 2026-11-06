// npm run voice -- <video> [--lang en|pt] [--scene <id>] [--force] [--yes]
//
// Narrates a video's scenes through ElevenLabs (lib/narrate.js): shows how many characters it will
// send, asks before sending (unless --yes), and writes voice/<video>/<lang>/<scene>.mp3. A scene
// that already has its mp3 is kept unless --force. Runs on the host, with the key read from
// ~/.config/snappingtrail/videos.env and never printed.

import path from 'node:path';
import readline from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
import {LANGS, loadScript} from './lib/script.js';
import {VOICE_ENV_FILE, charactersUsed, loadVoiceEnv, maskVoice, narrate, plan} from './lib/narrate.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const USAGE = 'usage: npm run voice -- <video> [--lang en|pt] [--scene <id>] [--force] [--yes]';

function parseArgs(argv) {
  const options = {video: null, langs: LANGS, only: null, force: false, yes: false};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--lang') {
      const lang = argv[++i];
      if (!LANGS.includes(lang)) throw new Error(`--lang is one of ${LANGS.join(', ')}`);
      options.langs = [lang];
    } else if (arg === '--scene') {
      options.only = argv[++i];
      if (!options.only) throw new Error('--scene takes a scene id');
    } else if (arg === '--force') options.force = true;
    else if (arg === '--yes') options.yes = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else if (!options.video) options.video = arg;
    else throw new Error(`one video at a time (${arg})`);
  }
  if (!options.video) throw new Error('which video?');
  return options;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}

const env = loadVoiceEnv();
if (!env) {
  console.error(`Missing ${VOICE_ENV_FILE} (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID_PT, ELEVENLABS_VOICE_ID_EN).`);
  process.exit(2);
}

const script = loadScript(DIR, options.video);
if (options.only && !script.scenes.some((s) => s.id === options.only)) {
  console.error(`No scene ${options.only} in ${options.video}`);
  process.exit(2);
}
const {todo, kept, characters} = plan(DIR, script, options);

for (const k of kept) console.log(`  ${k.lang} ${k.scene}: already narrated (--force to make it again)`);
if (todo.length === 0) {
  console.log('Nothing to narrate.');
  process.exit(0);
}
for (const lang of options.langs) {
  const mine = todo.filter((t) => t.lang === lang);
  if (mine.length) console.log(`${lang}: ${mine.length} scenes, ${mine.reduce((s, t) => s + t.text.length, 0)} characters`);
}
console.log(`Total to send to ElevenLabs: ${characters} characters, ${todo.length} scenes.`);

if (!options.yes) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  const answer = await rl.question('Send them? [y/N] ');
  rl.close();
  if (!/^(y|yes|s|sim)$/i.test(answer.trim())) {
    console.log('Nothing sent.');
    process.exit(1);
  }
}

const before = await charactersUsed({env});
try {
  const made = await narrate(todo, {env, log: (line) => console.log(line)});
  const charged = made.reduce((s, m) => s + (m.charged ?? 0), 0);
  const after = await charactersUsed({env});
  console.log(`Made ${made.length} mp3 files in voice/${script.id}/.`);
  if (made.some((m) => m.charged != null)) console.log(`Charged, per the API: ${charged} characters.`);
  if (before != null && after != null) console.log(`The account's characters used this period: ${before} → ${after} (${after - before}).`);
} catch (error) {
  console.error(maskVoice(error.message, env));
  console.error('Stopped. The scenes already made are kept; run again to make the rest.');
  process.exit(1);
}
