// npm test — the YouTube package: chapters, description and tags.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {loadScript} from '../lib/script.js';
import {chapters, description, tags, timestamp, youtubeProblems, youtubeTxt} from '../lib/youtube.js';

const HERE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const SCENES = [
  {id: '01-opening'},
  {id: '02-a', chapter: {en: 'Start', pt: 'Início'}},
  {id: '03-b'},
  {id: '04-c', chapter: {en: 'Middle', pt: 'Meio'}},
  {id: '05-d', chapter: {en: 'End', pt: 'Fim'}},
  {id: '06-closing'},
];
const SCRIPT = {
  id: 'demo',
  youtube: {title: {en: 'A title', pt: 'Um título'}, summary: {en: 'What it shows.', pt: 'O que mostra.'}, page: 'surveys', tags: {en: ['extra'], pt: ['extra']}},
  scenes: SCENES,
};

test('timestamps read as YouTube writes them / os tempos no formato do YouTube', () => {
  assert.equal(timestamp(0), '0:00');
  assert.equal(timestamp(65.9), '1:05');
  assert.equal(timestamp(3723), '1:02:03');
});

test('the first chapter starts at 0:00 with the opening, the last takes the closing / a vinheta entra no primeiro, o encerramento no último', () => {
  const list = chapters(SCENES, [3, 6, 5, 12, 8, 5], 'pt');
  assert.deepEqual(list.map((c) => [timestamp(c.start), c.name, c.seconds]), [['0:00', 'Início', 14], ['0:14', 'Meio', 12], ['0:26', 'Fim', 13]]);
});

test('a chapter under 10 s is refused, by name / um capítulo com menos de 10 s é recusado', () => {
  assert.throws(() => chapters(SCENES, [3, 6, 5, 9.5, 8, 5], 'en'), /shorter than 10 s in en: Middle/);
});

test('fewer than three chapters are refused / menos de três capítulos são recusados', () => {
  assert.throws(() => chapters(SCENES.slice(0, 4), [3, 10, 10, 10], 'en'), /2 chapters in en/);
});

test('the description: the sentence, the chapters, the manual and the signature / a descrição na ordem pedida', () => {
  const list = chapters(SCENES, [3, 6, 5, 12, 8, 5], 'en');
  assert.equal(description(SCRIPT, 'en', list), [
    'What it shows.', '', '0:00 Start', '0:14 Middle', '0:26 End', '',
    'Read the full manual: https://docs.snappingtrail.com/manual/surveys/', 'Snapping Trail · Navaho Consultoria',
  ].join('\n'));
  assert.match(description({...SCRIPT, youtube: {...SCRIPT.youtube, page: ''}}, 'pt', list), /Leia o manual completo: https:\/\/docs\.snappingtrail\.com\/pt\/manual\/\n/);
});

test('the tags are the common ones plus the video\'s / as tags comuns mais as do vídeo', () => {
  assert.deepEqual(tags(SCRIPT, 'pt').slice(-2), ['análise de pesquisa', 'extra']);
  assert.equal(tags(SCRIPT, 'en')[0], 'Snapping Trail');
  assert.match(youtubeTxt(SCRIPT, 'en', chapters(SCENES, [3, 6, 5, 12, 8, 5], 'en')), /^TITLE\nA title\n\nDESCRIPTION\n/);
});

test('every video script has a valid youtube block and chapters / todos os roteiros têm o bloco do YouTube', () => {
  const videos = fs.readdirSync(path.join(HERE, 'scripts')).filter((f) => f.endsWith('.yml')).map((f) => f.slice(0, -4));
  assert.equal(videos.length, 8);
  for (const video of videos) {
    const script = loadScript(HERE, video);
    assert.ok(script.youtube, `${video} has no youtube block`);
    assert.deepEqual(youtubeProblems(script), [], video);
    assert.ok(script.scenes.filter((s) => s.chapter).length >= 3, `${video} has fewer than three chapters`);
  }
});
