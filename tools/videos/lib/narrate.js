// The final narration, made by ElevenLabs' text-to-speech API from a video's script: one mp3 per
// scene and language, in voice/<video>/<lang>/<scene>.mp3, where the pipeline already looks.
// The API key and the voices' ids live outside the repository, in the owner's env file, and are
// masked in anything printed. See README.md.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LANGS} from './script.js';
import {finalVoice} from './voice.js';

export const VOICE_ENV_FILE = path.join(os.homedir(), '.config/snappingtrail/videos.env');
export const VOICE_KEYS = ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID_PT', 'ELEVENLABS_VOICE_ID_EN'];

export const API = 'https://api.elevenlabs.io';
export const MODEL = 'eleven_multilingual_v2';
// The models that take the language of the text in the call (`language_code`); the others detect
// it, and refuse the field.
export const LANGUAGE_CODE_MODELS = new Set(['eleven_turbo_v2_5', 'eleven_flash_v2_5']);
const FORMAT = 'mp3_44100_128';

/** The three settings, or null when the file or one of them is missing. */
export function loadVoiceEnv(file = VOICE_ENV_FILE) {
  if (!fs.existsSync(file)) return null;
  const parsed = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) parsed[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  if (!VOICE_KEYS.every((key) => parsed[key])) return null;
  return Object.fromEntries(VOICE_KEYS.map((key) => [key, parsed[key]]));
}

/** The text with every setting's value replaced by its name. */
export function maskVoice(text, env) {
  let out = String(text);
  for (const key of VOICE_KEYS) if (env[key]) out = out.split(env[key]).join(`<${key}>`);
  return out;
}

/** What the voice reads in a scene: its `voiceText` (pronunciation only), else its narration. */
export function spokenText(scene, lang) {
  const own = (value) => (typeof value === 'string' ? value : value?.[lang]) || null;
  return own(scene.voiceText) ?? own(scene.narration);
}

/**
 * The scenes to narrate: [{lang, scene, text, file}], skipping a scene that already has its voice
 * unless `force`. `only` keeps one scene.
 */
export function plan(dir, script, {langs = LANGS, only = null, force = false} = {}) {
  const todo = [];
  const kept = [];
  for (const lang of langs) {
    for (const scene of script.scenes) {
      if (only && scene.id !== only) continue;
      const text = spokenText(scene, lang);
      if (!text) continue;
      const existing = finalVoice(dir, script.id, lang, scene.id);
      if (existing && !force) {
        kept.push({lang, scene: scene.id, file: existing});
        continue;
      }
      todo.push({lang, scene: scene.id, text, file: path.join(dir, 'voice', script.id, lang, `${scene.id}.mp3`)});
    }
  }
  return {todo, kept, characters: todo.reduce((sum, t) => sum + t.text.length, 0)};
}

/** The request body for one text: the model, and the language when the model takes it. */
export function requestBody(text, lang, model = MODEL) {
  const body = {text, model_id: model};
  if (LANGUAGE_CODE_MODELS.has(model)) body.language_code = lang;
  return body;
}

/** One text to speech; the mp3's bytes and the characters the API says it charged. */
export async function synthesize({env, lang, text, model = MODEL, api = API, fetchImpl = fetch}) {
  const voiceId = env[lang === 'pt' ? 'ELEVENLABS_VOICE_ID_PT' : 'ELEVENLABS_VOICE_ID_EN'];
  const url = `${api}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${FORMAT}`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg'},
    body: JSON.stringify(requestBody(text, lang, model)),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 500);
    throw new Error(maskVoice(`ElevenLabs answered ${response.status}: ${detail}`, env));
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error('ElevenLabs answered with an empty audio');
  const charged = Number.parseInt(response.headers.get('x-character-count') ?? '', 10);
  return {bytes, charged: Number.isFinite(charged) ? charged : null};
}

/** The account's characters used so far this period, or null when the API does not say. */
export async function charactersUsed({env, api = API, fetchImpl = fetch}) {
  try {
    const response = await fetchImpl(`${api}/v1/user/subscription`, {headers: {'xi-api-key': env.ELEVENLABS_API_KEY}});
    if (!response.ok) return null;
    const body = await response.json();
    return Number.isFinite(body.character_count) ? body.character_count : null;
  } catch {
    return null;
  }
}

/**
 * Narrates every planned scene, one at a time, writing each mp3 only once its audio is complete.
 * Stops at the first error: the scenes already made stay, and a new run picks up the rest.
 */
export async function narrate(todo, {env, model = MODEL, api = API, fetchImpl = fetch, log = () => {}}) {
  const made = [];
  for (const item of todo) {
    const {bytes, charged} = await synthesize({env, lang: item.lang, text: item.text, model, api, fetchImpl});
    fs.mkdirSync(path.dirname(item.file), {recursive: true});
    const partial = `${item.file}.part`;
    fs.writeFileSync(partial, bytes);
    fs.renameSync(partial, item.file);
    made.push({...item, charged});
    log(`  ${item.lang} ${item.scene}: ${item.text.length} characters${charged != null ? `, ${charged} charged` : ''}`);
  }
  return made;
}
