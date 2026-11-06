// A video's YouTube package: the chapters from the scenes' real lengths, the description and the
// tags, written as youtube.txt, and the thumbnail. The scenes that start a chapter carry
// `chapter: {en, pt}`; the scenes after one belong to it, and the opening card belongs to the first.

import fs from 'node:fs';
import path from 'node:path';
import {LANGS, pick} from './script.js';

export const MANUAL = {en: 'https://docs.snappingtrail.com/manual/', pt: 'https://docs.snappingtrail.com/pt/manual/'};
export const READ = {en: 'Read the full manual:', pt: 'Leia o manual completo:'};
export const SIGNATURE = 'Snapping Trail · Navaho Consultoria';
export const COMMON_TAGS = {
  en: ['Snapping Trail', 'survey', 'research', 'customer feedback', 'field research', 'offline survey', 'survey analytics'],
  pt: ['Snapping Trail', 'pesquisa', 'pesquisa de satisfação', 'coleta offline', 'entrevista de campo', 'análise de pesquisa'],
};
/** YouTube's rules for chapters: the first at 0:00, at least three, each at least 10 s. */
export const MIN_CHAPTERS = 3;
export const MIN_CHAPTER_SECONDS = 10;

/** 0:00, 1:05, 1:02:03. */
export function timestamp(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * [{start, seconds, name}] of a video in a language, from its scenes and their lengths in seconds
 * (same order). The first chapter starts at 0:00, whatever scene opens it. Throws when the chapters
 * break YouTube's rules, naming the short ones.
 */
export function chapters(scenes, lengths, lang) {
  if (scenes.length !== lengths.length) throw new Error(`${scenes.length} scenes but ${lengths.length} lengths`);
  const out = [];
  let t = 0;
  scenes.forEach((scene, i) => {
    const name = scene.chapter ? pick(scene.chapter, lang) : null;
    if (name) out.push({start: out.length ? t : 0, seconds: 0, name});
    t += lengths[i];
  });
  if (out.length < MIN_CHAPTERS) throw new Error(`${out.length} chapters in ${lang}; YouTube needs at least ${MIN_CHAPTERS}`);
  out.forEach((c, i) => {
    c.seconds = (i + 1 < out.length ? out[i + 1].start : t) - c.start;
  });
  // A chapter is measured as YouTube shows it: from its timestamp to the next one.
  const short = out.filter((c, i) => Math.floor(i + 1 < out.length ? out[i + 1].start : t) - Math.floor(c.start) < MIN_CHAPTER_SECONDS);
  if (short.length) {
    throw new Error(`chapters shorter than ${MIN_CHAPTER_SECONDS} s in ${lang}: ${short.map((c) => `${c.name} (${c.seconds.toFixed(1)} s)`).join(', ')}`);
  }
  return out;
}

/** The manual's page of the video, in the language. */
export function manualUrl(page, lang) {
  return page ? `${MANUAL[lang]}${page}/` : MANUAL[lang];
}

/** The description: the sentence, the chapters, the manual's address and the signature. */
export function description(script, lang, list) {
  const yt = script.youtube;
  return [
    pick(yt.summary, lang),
    '',
    ...list.map((c) => `${timestamp(c.start)} ${c.name}`),
    '',
    `${READ[lang]} ${manualUrl(yt.page, lang)}`,
    SIGNATURE,
  ].join('\n');
}

export function tags(script, lang) {
  return [...new Set([...COMMON_TAGS[lang], ...(pick(script.youtube.tags, lang) ?? [])])];
}

/** youtube.txt: the title, the description and the tags, each under its own heading. */
export function youtubeTxt(script, lang, list) {
  return [
    'TITLE',
    pick(script.youtube.title, lang),
    '',
    'DESCRIPTION',
    description(script, lang, list),
    '',
    'TAGS',
    tags(script, lang).join(', '),
    '',
  ].join('\n');
}

/** The problems of a script's youtube block and chapters (empty when it has none). */
export function youtubeProblems(script) {
  const yt = script.youtube;
  if (!yt) return [];
  const problems = [];
  for (const lang of LANGS) {
    if (!pick(yt.title, lang)) problems.push(`youtube: no title in ${lang}`);
    else if (pick(yt.title, lang).length > 100) problems.push(`youtube: the title in ${lang} is over 100 characters`);
    if (!pick(yt.summary, lang)) problems.push(`youtube: no summary in ${lang}`);
    if (!Array.isArray(pick(yt.tags, lang))) problems.push(`youtube: tags in ${lang} are a list`);
  }
  if (typeof yt.page !== 'string') problems.push('youtube: page is the manual page ("" for its root)');
  for (const scene of script.scenes ?? []) {
    if (scene.chapter == null) continue;
    for (const lang of LANGS) if (!pick(scene.chapter, lang) || typeof pick(scene.chapter, lang) !== 'string') problems.push(`${scene.id}: chapter needs a name in ${lang}`);
  }
  return problems;
}

/** The thumbnail's HTML, 1280×720, in the opening card's look: the logo, the name and the title. */
export function thumbnailHtml(repo, title) {
  const logo = fs.readFileSync(path.join(repo, 'static/img/snappingtrail-icon.svg'), 'utf8').replace('<svg', '<svg class="logo"');
  const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1280px; height: 720px; }
  body { font-family: "Inter", "DejaVu Sans", "Noto Sans", sans-serif; background: #F5F7FB; color: #0F172A;
         display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 34px; padding: 0 80px; }
  .brand { display: flex; align-items: center; gap: 22px; }
  .logo { width: 120px; height: 120px; }
  .name { font-size: 54px; font-weight: 800; letter-spacing: -1px; }
  .name em { color: #2563EB; font-style: italic; }
  .title { font-size: 76px; font-weight: 800; line-height: 1.12; letter-spacing: -1px; text-align: center; color: #0F172A; }
  .bar { width: 160px; height: 10px; border-radius: 5px; background: #2563EB; }
  </style></head><body>
  <div class="brand">${logo}<div class="name">Snapping <em>Trail</em></div></div>
  <div class="bar"></div>
  <div class="title">${escape(title)}</div>
  </body></html>`;
}
