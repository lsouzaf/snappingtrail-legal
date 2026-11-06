// npm run youtube -- [<video> ...] [--lang en|pt]
//
// The YouTube packages, from the videos already made (npm run videos): for each video and
// language, out/youtube/<video>-<lang>/ with the mp4 and the srt, a 1280×720 thumbnail
// (thumbnail.png) and youtube.txt (title, description with the chapters, tags). The chapters
// come from the real length of each scene's segment (out/work/<video>/<lang>/<scene>.mp4).
// Runs in the videos' image (ffprobe, Playwright), like npm run videos; reads nothing from DEV.

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LANGS, loadScript, pick} from './lib/script.js';
import {chapters, thumbnailHtml, timestamp, youtubeProblems, youtubeTxt} from './lib/youtube.js';

const IMAGE = 'snappingtrail-docs-videos:1.64.1';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, '../..');
const OUT = path.join(DIR, 'out');

const args = process.argv.slice(2);
if (process.env.VIDEOS_INSIDE !== '1') {
  if (spawnSync('docker', ['image', 'inspect', IMAGE], {stdio: 'ignore'}).status !== 0) {
    console.error(`Missing the image ${IMAGE}: run npm run videos once to build it.`);
    process.exit(2);
  }
  const {uid, gid} = os.userInfo();
  const run = spawnSync('docker', [
    'run', '--rm', '--init', '--user', `${uid}:${gid}`, '-e', 'HOME=/tmp', '-e', 'VIDEOS_INSIDE=1',
    '-v', `${REPO}:/repo`, '-w', '/repo/tools/videos', IMAGE, 'node', 'youtube.js', ...args,
  ], {stdio: 'inherit'});
  process.exit(run.status ?? 1);
}

let langs = LANGS;
const videos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--lang') {
    const lang = args[++i];
    if (!LANGS.includes(lang)) {
      console.error(`--lang is one of ${LANGS.join(', ')}`);
      process.exit(2);
    }
    langs = [lang];
  } else videos.push(args[i]);
}
if (!videos.length) {
  for (const f of fs.readdirSync(path.join(DIR, 'scripts')).sort()) if (f.endsWith('.yml')) videos.push(f.slice(0, -4));
}

function seconds(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffprobe ${file}: ${r.stderr}`);
  return Number.parseFloat(r.stdout.trim());
}

const {chromium} = await import('@playwright/test');
const browser = await chromium.launch();
let failed = 0;
try {
  for (const video of videos) {
    const script = loadScript(DIR, video);
    const problems = youtubeProblems(script);
    if (!script.youtube) problems.push('no youtube block');
    if (problems.length) throw new Error(`${video}:\n  - ${problems.join('\n  - ')}`);
    for (const lang of langs) {
      const name = `${video}-${lang}`;
      try {
        const mp4 = path.join(OUT, `${name}.mp4`);
        const srt = path.join(OUT, `${name}.srt`);
        for (const f of [mp4, srt]) if (!fs.existsSync(f)) throw new Error(`missing ${path.relative(DIR, f)}: run npm run videos -- ${video} --lang ${lang}`);
        const lengths = script.scenes.map((scene) => {
          const segment = path.join(OUT, 'work', video, lang, `${scene.id}.mp4`);
          if (!fs.existsSync(segment)) throw new Error(`missing ${path.relative(DIR, segment)}`);
          return seconds(segment);
        });
        const total = seconds(mp4);
        const sum = lengths.reduce((a, b) => a + b, 0);
        // The segments must be the ones the mp4 was made of.
        if (Math.abs(total - sum) > 1) throw new Error(`the scenes add up to ${sum.toFixed(1)} s but the mp4 has ${total.toFixed(1)} s: make the video again`);
        const list = chapters(script.scenes, lengths, lang);

        const dir = path.join(OUT, 'youtube', name);
        fs.rmSync(dir, {recursive: true, force: true});
        fs.mkdirSync(dir, {recursive: true});
        fs.copyFileSync(mp4, path.join(dir, `${name}.mp4`));
        fs.copyFileSync(srt, path.join(dir, `${name}.srt`));
        fs.writeFileSync(path.join(dir, 'youtube.txt'), youtubeTxt(script, lang, list));

        const context = await browser.newContext({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1});
        const page = await context.newPage();
        await page.setContent(thumbnailHtml(REPO, pick(script.title, lang)), {waitUntil: 'load'});
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({path: path.join(dir, 'thumbnail.png')});
        await context.close();

        console.log(`${path.relative(DIR, dir)}: ${timestamp(total)} (${total.toFixed(1)} s), ${list.length} chapters`);
        for (const c of list) console.log(`  ${timestamp(c.start)} ${c.name} (${c.seconds.toFixed(1)} s)`);
      } catch (error) {
        failed++;
        console.error(`${name}: ${error.message}`);
      }
    }
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
