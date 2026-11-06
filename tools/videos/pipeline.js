// The whole video, in each language: narration, recording, assembly and subtitles.
//   node pipeline.js <video> [--lang en|pt]      (run by run.js, inside the image)
//
// For each scene: the narration (the final voice, or the provisional one) sets its length — the
// longer of the narration plus a short lead and tail, and the scene's minimum —, then its screen is
// recorded or drawn to that length (an app scene may run longer, if its actions need it), and the
// segment is made. The segments are joined into out/<video>-<lang>.mp4, with out/<video>-<lang>.srt.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {LANGS, loadScript, partsOf, pick} from './lib/script.js';
import {narration} from './lib/voice.js';
import {renderCard} from './lib/cards.js';
import {recordApp} from './lib/record.js';
import {LEAD, TAIL, appVideo, concat, imagesVideo, segment, srt, stillVideo} from './lib/assemble.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, '../..');
const DOCS = {en: path.join(REPO, 'docs'), pt: path.join(REPO, 'i18n/pt/docusaurus-plugin-content-docs/current')};

const args = process.argv.slice(2);
const video = args[0];
const only = args.includes('--lang') ? [args[args.indexOf('--lang') + 1]] : LANGS;
const script = loadScript(DIR, video);

async function scenePart(browser, part, i, seconds, lang, work, scene) {
  const out = path.join(work, 'parts', `${scene.id}-${i}.mp4`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  if (part.card) {
    const png = await renderCard(browser, part.card, path.join(work, 'cards', `${part.card}.png`), {dir: DIR, repo: REPO, lang, script});
    return {file: stillVideo(png, seconds, out), seconds};
  }
  if (part.images) {
    const images = part.images.map((p) => p.replace('{docs}', DOCS[lang]).replace('{lang}', lang));
    for (const img of images) if (!fs.existsSync(img)) throw new Error(`${scene.id}: no image ${img}`);
    return {file: imagesVideo(images, seconds, out), seconds};
  }
  const frames = path.join(work, 'frames', `${scene.id}-${i}`);
  const recorded = await recordApp(browser, part.app, part.actions ?? scene.screen.actions, lang, frames, seconds);
  return {file: appVideo(frames, recorded, out), seconds: recorded};
}

async function make(browser, lang) {
  const work = path.join(DIR, 'out', 'work', video, lang);
  fs.mkdirSync(work, {recursive: true});
  const segments = [];
  const entries = [];
  let start = 0;
  let provisional = 0;
  for (const scene of script.scenes) {
    const text = pick(scene.narration, lang);
    const voice = narration(DIR, work, video, lang, scene.id, text);
    if (voice?.provisional) provisional += 1;
    const planned = Math.max(scene.minDuration, voice ? LEAD + voice.seconds + TAIL : 0);

    const parts = partsOf(scene);
    const shares = parts.map((p) => p.share ?? 1 / parts.length);
    const made = [];
    for (const [i, part] of parts.entries()) {
      made.push(await scenePart(browser, part, i, planned * shares[i], lang, work, scene));
    }
    const seconds = made.reduce((n, m) => n + m.seconds, 0);
    const video1 = made.length === 1 ? made[0].file : concat(made.map((m) => m.file), path.join(work, 'parts', `${scene.id}.mp4`));
    segments.push(segment(video1, voice?.file, seconds, path.join(work, `${scene.id}.mp4`)));
    entries.push({start, seconds: voice?.seconds ?? 0, text});
    console.log(`  ${lang} ${scene.id}: ${seconds.toFixed(1)} s${voice ? ` (narration ${voice.seconds.toFixed(1)} s${voice.provisional ? ', provisional voice' : ''})` : ''}`);
    start += seconds;
  }
  const outDir = path.join(DIR, 'out');
  const mp4 = concat(segments, path.join(outDir, `${video}-${lang}.mp4`));
  fs.writeFileSync(path.join(outDir, `${video}-${lang}.srt`), srt(entries));
  console.log(`${path.relative(DIR, mp4)}: ${start.toFixed(1)} s, ${segments.length} scenes${provisional ? `, ${provisional} with the provisional voice` : ''}`);
}

const browser = await chromium.launch();
try {
  for (const lang of only) {
    console.log(`${video} (${lang})`);
    await make(browser, lang);
  }
} finally {
  await browser.close();
}
