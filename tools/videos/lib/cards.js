// The still screens of a video, drawn as HTML and photographed by Playwright at 1920×1080: the
// opening (logo and title), the closing (logo, the manual's address and its line) and the Slack
// message of FitPlus's findings (assets/slack-findings.yml).

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import {pick} from './script.js';

const W = 1920;
const H = 1080;

const CLOSING = {en: 'Everything you saw is in the manual', pt: 'Tudo o que você viu está no manual'};

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

function page(body, extraCss = '') {
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
  ${extraCss}
  </style></head><body>${body}</body></html>`;
}

function logo(repo) {
  return fs.readFileSync(path.join(repo, 'static/img/snappingtrail-icon.svg'), 'utf8')
    .replace('<svg', '<svg class="logo"');
}

function brand(repo) {
  return `${logo(repo)}<div class="name">Snapping <em>Trail</em></div>`;
}

function slack(dir, lang) {
  const data = YAML.parse(fs.readFileSync(path.join(dir, 'assets/slack-findings.yml'), 'utf8'));
  const m = data[lang];
  const items = m.items
    .map((i) => `<li><span class="marker">${i.marker}</span> <b>${escape(i.strength)}</b> — ${escape(i.text)}</li>`)
    .join('');
  return page(
    `<div class="slack">
      <div class="channel">${escape(data.channel)}</div>
      <div class="msg">
        <div class="avatar">ST</div>
        <div class="body">
          <div class="who"><b>${escape(data.app)}</b> <span class="tag">APP</span> <span class="time">9:00</span></div>
          <div class="header">${escape(m.header)}</div>
          <div class="context">${escape(m.context)}</div>
          <ul>${items}</ul>
          <div class="button">${escape(m.button)}</div>
        </div>
      </div>
    </div>`,
    `.slack { width: 1400px; background: #fff; border-radius: 18px; box-shadow: 0 20px 60px rgba(15,23,42,.15);
              font-family: "Lato", "DejaVu Sans", sans-serif; overflow: hidden; }
     .channel { background: #3F0E40; color: #fff; font-size: 30px; font-weight: 700; padding: 22px 36px; }
     .msg { display: flex; gap: 24px; padding: 36px; }
     .avatar { flex: none; width: 72px; height: 72px; border-radius: 12px; background: #2563EB; color: #fff;
               font-weight: 800; font-size: 28px; display: flex; align-items: center; justify-content: center; }
     .who { font-size: 28px; } .tag { font-size: 18px; background: #E2E8F0; padding: 2px 6px; border-radius: 4px; }
     .time { color: #64748B; font-size: 22px; }
     .header { font-size: 36px; font-weight: 800; margin: 18px 0 6px; }
     .context { color: #64748B; font-size: 24px; margin-bottom: 18px; }
     ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 16px; font-size: 28px; line-height: 1.4; }
     .button { display: inline-block; margin-top: 26px; border: 2px solid #CBD5E1; border-radius: 8px;
               padding: 10px 22px; font-size: 26px; font-weight: 700; }`,
  );
}

function html(kind, {dir, repo, lang, script}) {
  if (kind === 'opening') {
    return page(`<div class="brand">${brand(repo)}<div class="title">${escape(pick(script.title, lang))}</div></div>`);
  }
  if (kind === 'closing') {
    return page(`<div class="brand">${brand(repo)}<div class="line">${escape(CLOSING[lang])}</div><div class="url">docs.snappingtrail.com</div></div>`);
  }
  if (kind === 'slack') return slack(dir, lang);
  throw new Error(`No card "${kind}" (opening, closing, slack)`);
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
