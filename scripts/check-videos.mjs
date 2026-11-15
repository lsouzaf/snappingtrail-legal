// Checks the tutorial videos in the built manual (npm run check:videos, after npm run build):
// every page of the table carries its own video, in its own language, and no video shows up on any
// other page. Reads the data attributes ManualVideo always writes (data-manual-video,
// data-video-id), so the check works before the premiere too, while the player is hidden.
//
// usage: node scripts/check-videos.mjs [build dir]

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'build');
const data = JSON.parse(fs.readFileSync(new URL('../src/data/videos.json', import.meta.url), 'utf8'));

// The manual page of each video number, the same slug in both languages.
const PAGES = {
  '01': '',
  '02': 'getting-started/',
  '03': 'surveys/',
  '04': 'collection/',
  '05': 'collect-app/',
  '06': 'results/',
  '07': 'integrations/',
  '08': 'administration/',
};
const PREFIX = {en: 'manual/', pt: 'pt/manual/'};

const problems = [];

// The ids: 16, distinct, 11 characters of YouTube's alphabet.
const expected = [];
for (const [n, page] of Object.entries(PAGES)) {
  for (const lang of ['en', 'pt']) {
    const id = data.videos[n]?.[lang]?.id;
    if (!id) problems.push(`videos.json: no id for ${n} ${lang}`);
    else if (!/^[A-Za-z0-9_-]{11}$/.test(id)) problems.push(`videos.json: ${n} ${lang} "${id}" is not 11 characters of [A-Za-z0-9_-]`);
    expected.push({n, lang, id, file: path.join(root, PREFIX[lang], page, 'index.html')});
  }
}
if (Object.keys(data.videos).length !== 8) problems.push(`videos.json: ${Object.keys(data.videos).length} numbers, 8 expected`);
const ids = expected.map((e) => e.id).filter(Boolean);
if (new Set(ids).size !== ids.length) problems.push(`videos.json: the ids repeat (${ids.length} ids, ${new Set(ids).size} distinct)`);

// Every built page.
function htmlFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith('.html') ? [p] : [];
  });
}
if (!fs.existsSync(root)) {
  console.error(`No build at ${root}: run npm run build first.`);
  process.exit(2);
}
const pages = htmlFiles(root);
const owner = new Map(expected.map((e) => [e.file, e]));

for (const e of expected) {
  if (!fs.existsSync(e.file)) {
    problems.push(`${path.relative(root, e.file)}: missing (video ${e.n} ${e.lang})`);
    continue;
  }
  const html = fs.readFileSync(e.file, 'utf8');
  const tags = [...html.matchAll(/data-manual-video="([^"]*)"\s+data-video-id="([^"]*)"/g)];
  if (tags.length !== 1 || tags[0][1] !== e.n || tags[0][2] !== e.id) {
    problems.push(`${path.relative(root, e.file)}: expected video ${e.n} ${e.lang} (${e.id}), found ${JSON.stringify(tags.map((t) => [t[1], t[2]]))}`);
  }
}

// No id anywhere but on its own page.
for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  for (const e of expected) {
    if (e.id && html.includes(e.id) && owner.get(file) !== e) {
      problems.push(`${path.relative(root, file)}: carries ${e.id}, video ${e.n} ${e.lang}, which belongs to ${path.relative(root, e.file)}`);
    }
  }
}

if (problems.length) {
  console.error(`check-videos: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`check-videos: ${expected.length} pages, each with its own video; ${pages.length} pages checked, no id out of place.`);
