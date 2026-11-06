// npm test — the narration through ElevenLabs, against a simulated API: no request leaves.

import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {loadVoiceEnv, maskVoice, narrate, plan, requestBody, spokenText, synthesize} from '../lib/narrate.js';

const HERE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV = {ELEVENLABS_API_KEY: 'key-123', ELEVENLABS_VOICE_ID_PT: 'voice-pt', ELEVENLABS_VOICE_ID_EN: 'voice-en'};

const SCRIPT = {
  id: 'demo',
  scenes: [
    {id: '01-opening', screen: {card: 'opening'}},
    {id: '02-hello', narration: {en: 'Hello there.', pt: 'Olá, tudo bem.'}},
    {id: '03-name', narration: {en: 'Snapping Trail.', pt: 'O Snapping Trail.'}, voiceText: {pt: 'O Isnéping Treil.'}},
  ],
};

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'narrate-'));
}

/** A simulated ElevenLabs: records each call and answers with a few bytes of "audio". */
function fakeApi({status = 200, body = 'ID3audio', charged = '12'} = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({url, init});
    return new Response(status === 200 ? body : '{"detail":"quota_exceeded key-123"}', {
      status,
      headers: charged ? {'x-character-count': charged} : {},
    });
  };
  return {calls, fetchImpl};
}

test('the voice reads voiceText when there is one, and the narration otherwise / a voz lê o voiceText quando existe', () => {
  assert.equal(spokenText(SCRIPT.scenes[2], 'pt'), 'O Isnéping Treil.');
  assert.equal(spokenText(SCRIPT.scenes[2], 'en'), 'Snapping Trail.');
  assert.equal(spokenText(SCRIPT.scenes[0], 'en'), null);
});

test('the plan counts the characters of the scenes with narration only / o plano conta só as cenas com narração', () => {
  const {todo, characters} = plan(tempDir(), SCRIPT, {langs: ['en', 'pt']});
  assert.deepEqual(todo.map((t) => `${t.lang}/${t.scene}`), ['en/02-hello', 'en/03-name', 'pt/02-hello', 'pt/03-name']);
  assert.equal(characters, 'Hello there.'.length + 'Snapping Trail.'.length + 'Olá, tudo bem.'.length + 'O Isnéping Treil.'.length);
});

test('a scene that already has its mp3 is kept, unless forced / uma cena que já tem mp3 não é refeita, salvo com --force', () => {
  const dir = tempDir();
  const existing = path.join(dir, 'voice', 'demo', 'pt', '02-hello.mp3');
  fs.mkdirSync(path.dirname(existing), {recursive: true});
  fs.writeFileSync(existing, 'old');

  const kept = plan(dir, SCRIPT, {langs: ['pt']});
  assert.deepEqual(kept.todo.map((t) => t.scene), ['03-name']);
  assert.deepEqual(kept.kept.map((k) => k.scene), ['02-hello']);

  const forced = plan(dir, SCRIPT, {langs: ['pt'], force: true});
  assert.deepEqual(forced.todo.map((t) => t.scene), ['02-hello', '03-name']);
});

test('--scene keeps a single scene / --scene gera uma cena só', () => {
  const {todo} = plan(tempDir(), SCRIPT, {only: '03-name'});
  assert.deepEqual(todo.map((t) => `${t.lang}/${t.scene}`), ['en/03-name', 'pt/03-name']);
});

test('the call uses the multilingual model, the language voice and the key header / a chamada usa o modelo multilíngue', async () => {
  const api = fakeApi();
  const {bytes, charged} = await synthesize({env: ENV, lang: 'pt', text: 'Olá.', api: 'http://simulated', fetchImpl: api.fetchImpl});
  assert.equal(bytes.toString(), 'ID3audio');
  assert.equal(charged, 12);
  const [{url, init}] = api.calls;
  assert.equal(url, 'http://simulated/v1/text-to-speech/voice-pt?output_format=mp3_44100_128');
  assert.equal(init.headers['xi-api-key'], 'key-123');
  assert.deepEqual(JSON.parse(init.body), {text: 'Olá.', model_id: 'eleven_multilingual_v2'});
});

test('the language goes in the call for a model that takes it / o idioma vai na chamada quando o modelo aceita', () => {
  assert.deepEqual(requestBody('Hi.', 'en', 'eleven_turbo_v2_5'), {text: 'Hi.', model_id: 'eleven_turbo_v2_5', language_code: 'en'});
  assert.equal('language_code' in requestBody('Hi.', 'en'), false);
});

test('narrate writes each mp3 in voice/<video>/<lang>/<scene>.mp3 / grava cada mp3 no lugar do pipeline', async () => {
  const dir = tempDir();
  const api = fakeApi();
  const {todo} = plan(dir, SCRIPT, {langs: ['en']});
  const made = await narrate(todo, {env: ENV, api: 'http://simulated', fetchImpl: api.fetchImpl});
  assert.equal(made.length, 2);
  assert.equal(fs.readFileSync(path.join(dir, 'voice', 'demo', 'en', '02-hello.mp3'), 'utf8'), 'ID3audio');
  assert.equal(fs.existsSync(path.join(dir, 'voice', 'demo', 'en', '02-hello.mp3.part')), false);
});

test('an API error stops the run, says the status and never shows the key / um erro da API para e não mostra a chave', async () => {
  const dir = tempDir();
  const api = fakeApi({status: 401});
  const {todo} = plan(dir, SCRIPT, {langs: ['en']});
  await assert.rejects(narrate(todo, {env: ENV, api: 'http://simulated', fetchImpl: api.fetchImpl}), (error) => {
    assert.match(error.message, /401/);
    assert.doesNotMatch(error.message, /key-123/);
    return true;
  });
  assert.equal(api.calls.length, 1);
  assert.equal(fs.existsSync(path.join(dir, 'voice', 'demo', 'en', '02-hello.mp3')), false);
});

test('the settings come from the env file, and are masked / as configurações vêm do arquivo e são mascaradas', () => {
  const file = path.join(tempDir(), 'videos.env');
  assert.equal(loadVoiceEnv(file), null);
  fs.writeFileSync(file, 'ELEVENLABS_API_KEY="key-123"\nELEVENLABS_VOICE_ID_PT=voice-pt\n');
  assert.equal(loadVoiceEnv(file), null, 'one setting missing');
  fs.appendFileSync(file, 'export ELEVENLABS_VOICE_ID_EN=voice-en\n');
  assert.deepEqual(loadVoiceEnv(file), ENV);
  assert.equal(maskVoice('key-123 voice-pt', ENV), '<ELEVENLABS_API_KEY> <ELEVENLABS_VOICE_ID_PT>');
});

/** The command with HOME pointing to a folder of the test's own, so it never sees the real settings. */
function command(args, {env = true, input = ''} = {}) {
  const home = tempDir();
  if (env) {
    fs.mkdirSync(path.join(home, '.config', 'snappingtrail'), {recursive: true});
    fs.writeFileSync(path.join(home, '.config', 'snappingtrail', 'videos.env'),
      'ELEVENLABS_API_KEY=key-123\nELEVENLABS_VOICE_ID_PT=voice-pt\nELEVENLABS_VOICE_ID_EN=voice-en\n');
  }
  return spawnSync(process.execPath, ['narrate.js', ...args], {cwd: HERE, env: {...process.env, HOME: home}, input, encoding: 'utf8'});
}

test('without the env file, the command stops and says so / sem o arquivo, o comando para e diz', () => {
  const run = command(['01-overview'], {env: false});
  assert.equal(run.status, 2);
  assert.match(run.stderr, /videos\.env/);
});

test('the command shows the total and sends nothing without a yes / mostra o total e não envia sem confirmação', () => {
  const run = command(['01-overview', '--lang', 'pt', '--scene', '02-welcome', '--force'], {input: 'n\n'});
  assert.equal(run.status, 1);
  assert.match(run.stdout, /Total to send to ElevenLabs: \d+ characters, 1 scenes\./);
  assert.match(run.stdout, /Nothing sent\./);
  assert.doesNotMatch(run.stdout + run.stderr, /key-123|voice-pt/);
});
