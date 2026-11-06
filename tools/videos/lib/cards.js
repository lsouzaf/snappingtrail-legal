// The still screens of a video, drawn as HTML and photographed by Playwright at 1920×1080: the
// opening (logo and title) and the closing (logo, the manual's address and its line).

import fs from 'node:fs';
import path from 'node:path';
import {pick} from './script.js';

const W = 1920;
const H = 1080;

const CLOSING = {en: 'Everything you saw is in the manual', pt: 'Tudo o que você viu está no manual'};

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

function page(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${W}px; height: ${H}px; }
  body { font-family: "Inter", "DejaVu Sans", "Noto Sans", sans-serif; background: #F5F7FB; color: #0F172A;
         display: flex; align-items: center; justify-content: center; }
  .brand { display: flex; flex-direction: column; align-items: center; gap: 36px; }
  .logo { width: 180px; height: 180px; }
  .name { font-size: 64px; font-weight: 800; letter-spacing: -1px; }
  .name em { color: #2563EB; font-style: italic; }
  .title { font-size: 52px; font-weight: 600; color: #334155; }
  .line { font-size: 48px; font-weight: 600; color: #334155; }
  .url { font-size: 40px; font-weight: 700; color: #2563EB; }
  </style></head><body>${body}</body></html>`;
}

function logo(repo) {
  return fs.readFileSync(path.join(repo, 'static/img/snappingtrail-icon.svg'), 'utf8')
    .replace('<svg', '<svg class="logo"');
}

function brand(repo) {
  return `${logo(repo)}<div class="name">Snapping <em>Trail</em></div>`;
}

function html(kind, {repo, lang, script}) {
  if (kind === 'opening') {
    return page(`<div class="brand">${brand(repo)}<div class="title">${escape(pick(script.title, lang))}</div></div>`);
  }
  if (kind === 'closing') {
    return page(`<div class="brand">${brand(repo)}<div class="line">${escape(CLOSING[lang])}</div><div class="url">docs.snappingtrail.com</div></div>`);
  }
  throw new Error(`No card "${kind}" (opening, closing)`);
}

/** The card as a 1920×1080 PNG. */
export async function renderCard(browser, kind, file, ctx) {
  const context = await browser.newContext({viewport: {width: W, height: H}, deviceScaleFactor: 1});
  const p = await context.newPage();
  await p.setContent(html(kind, ctx), {waitUntil: 'load'});
  await p.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  await p.screenshot({path: file});
  await context.close();
  return file;
}
