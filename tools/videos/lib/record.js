// An app scene, recorded: the tenant of the language, signed in with the captures' session (or
// signed in again, from the env file), the setup steps done off camera, then the actions on camera,
// with a visible cursor and smooth movements, held until the scene's time. The frames come from
// Chromium's screencast (sharper than Playwright's own video) and are written as JPEGs with an
// ffconcat list of their durations, which ffmpeg turns into the scene's video.
//
// The rules of the captures hold: nothing is written in DEV — any request to the API other than a
// read is refused and fails the scene —, the share links are masked and the QR codes blurred, and
// no trace, video or screenshot of the sign-in is kept.

import fs from 'node:fs';
import path from 'node:path';
import {statePath} from '../../captures/lib/state.js';
import {pick} from './script.js';

export const W = 1920;
export const H = 1080;

const TENANT = {en: () => process.env.DOCS_EN_URL, pt: () => process.env.DOCS_PT_URL};
const LOCALE = {en: 'en-US', pt: 'pt-BR'};
const LOGIN = {en: 'Login', pt: 'Entrar'};
const MASKED_URL = (lang) => `https://yourcompany.app.snappingtrail.com/s/••••••••?lang=${lang}`;

/** Hidden or masked on every recorded screen: animations, the caret, the notifications dot. */
const STABLE_CSS = `
*, *::before, *::after { caret-color: transparent !important; }
button[aria-label="Notifications"] > span.absolute { display: none !important; }
html, main, * { scroll-behavior: auto !important; }
`;
const MASK_CSS = {
  qrCode: 'img[alt="QR Code"] { filter: blur(14px) !important; }',
  shareLinks: '',
  fields: 'main input, main textarea, main select { filter: blur(10px) !important; }',
};

/** The cursor drawn on the page (headless Chromium draws none), and its click ripple. */
function cursorScript() {
  const install = () => {
    if (document.getElementById('__cursor')) return;
    const c = document.createElement('div');
    c.id = '__cursor';
    c.innerHTML =
      '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 14.8 L11.6 21.5 L14.4 20.3 L11.3 13.7 L17.5 13.7 Z" fill="#0F172A" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {
      position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none',
      transform: `translate(${window.__cx ?? -100}px, ${window.__cy ?? -100}px)`,
      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))',
    });
    document.documentElement.appendChild(c);
  };
  document.addEventListener('mousemove', (e) => {
    window.__cx = e.clientX;
    window.__cy = e.clientY;
    install();
    document.getElementById('__cursor').style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }, true);
  document.addEventListener('mousedown', (e) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: `${e.clientX - 22}px`, top: `${e.clientY - 22}px`, width: '44px', height: '44px',
      borderRadius: '50%', background: 'rgba(37,99,235,.35)', zIndex: '2147483646', pointerEvents: 'none',
      transition: 'transform .45s ease-out, opacity .45s ease-out',
    });
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 600);
  }, true);
  document.addEventListener('DOMContentLoaded', install);
}

/** Replaces, on screen only, every share link by the masked one, as the screen changes. */
function maskLinksScript(masked) {
  // An address already masked (its id is bullets) is left alone, or the observer would loop.
  const pattern = /https?:\/\/\S*\/s\/(?!•)[^\s"']*/g;
  const apply = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (pattern.test(n.textContent)) n.textContent = n.textContent.replace(pattern, masked);
      pattern.lastIndex = 0;
    }
    for (const el of document.querySelectorAll('input, textarea')) {
      if (/\/s\/(?!•)/.test(el.value)) el.value = masked;
    }
  };
  const start = () => {
    apply();
    new MutationObserver(apply).observe(document.body, {subtree: true, childList: true, characterData: true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}

/** The element a step points at: by role, test id, CSS or text, in [within], the nth match. */
export function locate(page, t, lang) {
  const root = t.within ? page.locator(t.within).first() : page;
  const text = pick(t.text, lang);
  let loc;
  if (t.role) loc = root.getByRole(t.role, text ? {name: text, exact: !!t.exact} : {});
  else if (t.testid) loc = root.getByTestId(t.testid);
  else if (t.css) loc = root.locator(t.css);
  else loc = root.getByText(text, {exact: !!t.exact});
  if (t.hasText) loc = loc.filter({hasText: pick(t.hasText, lang)});
  if (t.visible) loc = loc.filter({visible: true});
  loc = loc.nth(t.nth ?? 0);
  if (t.parent) loc = loc.locator('xpath=..');
  // An insight's whole card, from its type chip.
  if (t.card) loc = loc.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
  return loc;
}

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/** Moves the cursor to (x, y) in [seconds], eased. */
async function glideTo(page, x, y, seconds) {
  const from = await page.evaluate(() => [window.__cx ?? 960, window.__cy ?? 980]);
  const steps = Math.max(2, Math.round(seconds * 60));
  for (let i = 1; i <= steps; i += 1) {
    const k = ease(i / steps);
    await page.mouse.move(from[0] + (x - from[0]) * k, from[1] + (y - from[1]) * k);
    await sleep(seconds / steps);
  }
}

async function centerOf(locator) {
  await locator.waitFor({state: 'visible'});
  const box = await locator.boundingBox();
  if (!box) throw new Error('A step points at something with no box on screen');
  return [box.x + Math.min(box.width / 2, 220), box.y + Math.min(box.height / 2, 40)];
}

/** Scrolls the page's scrolling area (the app's main, or the window) by [by] pixels, or to bring [target] near the top. */
async function smoothScroll(page, {by, target, seconds}) {
  const handle = target ? await target.elementHandle() : null;
  await page.evaluate(
    async ({by, el, ms}) => {
      const scroller = (() => {
        const start = el ?? document.querySelector('main');
        for (let p = start; p; p = p.parentElement) {
          if (p.scrollHeight > p.clientHeight + 4 && getComputedStyle(p).overflowY !== 'visible') return p;
        }
        return document.scrollingElement;
      })();
      const from = scroller.scrollTop;
      let to = from + (by ?? 0);
      if (el) {
        const top = el.getBoundingClientRect().top;
        const base = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
        to = from + top - base - 120;
      }
      to = Math.max(0, Math.min(to, scroller.scrollHeight - scroller.clientHeight));
      const t0 = performance.now();
      await new Promise((done) => {
        const tick = (now) => {
          const x = Math.min(1, (now - t0) / ms);
          const k = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
          scroller.scrollTop = from + (to - from) * k;
          if (x < 1) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      });
    },
    {by, el: handle, ms: Math.max(1, seconds * 1000)},
  );
}

/** One step of the setup (off camera, at full speed) or of the actions (on camera, smooth). */
async function step(page, s, lang, onCamera) {
  if (s.wait != null) return sleep(s.wait);
  if (s.goto) {
    await page.goto(`${s.goto}${s.goto.includes('?') ? '&' : '?'}lang=${lang}`);
    return page.waitForLoadState('networkidle');
  }
  if (s.waitFor) return locate(page, s.waitFor, lang).waitFor({state: 'visible'});
  if (s.click) {
    const target = locate(page, s.click, lang);
    if (onCamera) {
      const [x, y] = await centerOf(target);
      await glideTo(page, x, y, s.click.duration ?? 1.2);
      await sleep(0.25);
      await page.mouse.down();
      await page.mouse.up();
    } else {
      await target.click();
    }
    await page.waitForLoadState('networkidle');
    return sleep(onCamera ? 0.4 : 0.2);
  }
  if (s.glide) {
    const [x, y] = await centerOf(locate(page, s.glide, lang));
    return glideTo(page, x, y, s.glide.duration ?? 1.5);
  }
  if (s.scroll) return smoothScroll(page, {by: s.scroll.by, seconds: s.scroll.duration ?? 3});
  if (s.scrollTo) {
    return smoothScroll(page, {target: locate(page, s.scrollTo, lang), seconds: s.scrollTo.duration ?? 2});
  }
  if (s.highlight) {
    const handle = await locate(page, s.highlight, lang).elementHandle();
    await page.evaluate((el) => {
      el.style.transition = 'box-shadow .6s ease';
      el.style.boxShadow = '0 0 0 4px rgba(37,99,235,.85), 0 18px 48px rgba(37,99,235,.25)';
    }, handle);
    return sleep(s.highlight.duration ?? 3);
  }
  if (s.zoom) {
    const box = await locate(page, s.zoom, lang).boundingBox();
    if (!box) throw new Error('zoom: nothing on screen');
    const ms = (s.zoom.duration ?? 1.5) * 1000;
    await page.evaluate(
      ({x, y, scale, ms}) => {
        const root = document.body;
        root.style.transformOrigin = `${x}px ${y + window.scrollY}px`;
        root.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.2,1)`;
        root.style.transform = `scale(${scale})`;
      },
      {x: box.x + box.width / 2, y: box.y + box.height / 2, scale: s.zoom.scale ?? 2.5, ms},
    );
    await page.mouse.move(-50, -50);
    return sleep(ms / 1000 + 0.1);
  }
  throw new Error(`Unknown step ${JSON.stringify(s)}`);
}

async function signIn(page, lang) {
  await page.goto(`/?lang=${lang}`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', {name: LOGIN[lang], exact: true}).filter({visible: true}).first().click();
  const menu = page.locator('a[href="/settings"]');
  const deadline = Date.now() + 45_000;
  let form = null;
  while (!form && !(await menu.isVisible())) {
    if (Date.now() > deadline) throw new Error('Neither the sign-in form nor the app came up');
    for (const frame of page.frames()) {
      if (await frame.locator('input[type="password"]').isVisible().catch(() => false)) form = frame;
    }
    if (!form) await sleep(0.5);
  }
  if (form) {
    await form.locator('input[type="email"], input[name="username"]').first().fill(process.env.DOCS_USER);
    await form.locator('input[type="password"]').fill(process.env.DOCS_PASSWORD);
    await form.locator('button[type="submit"], input[type="submit"]').first().click();
  }
  await menu.waitFor({timeout: 45_000});
  await page.waitForLoadState('networkidle');
}

/** A browser context in the language's tenant, signed in (or not), refusing every write to the API. */
async function openContext(browser, lang, signedIn) {
  const state = statePath(lang);
  const context = await browser.newContext({
    baseURL: TENANT[lang](),
    viewport: {width: W, height: H},
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'light',
    timezoneId: 'UTC',
    locale: LOCALE[lang],
    ...(signedIn && fs.existsSync(state) ? {storageState: state} : {}),
  });
  const writes = [];
  await context.route('**/*', async (route) => {
    const r = route.request();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && /\/api\//.test(new URL(r.url()).pathname)) {
      writes.push(`${r.method()} ${new URL(r.url()).pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  return {context, writes};
}

/**
 * Records one app part: setup off camera, then the actions on camera, held until [minSeconds].
 * Writes the frames and frames.ffconcat in [workDir]; returns the seconds recorded.
 */
export async function recordApp(browser, app, actions, lang, workDir, minSeconds) {
  const signedIn = app.signedIn !== false;
  const {context, writes} = await openContext(browser, lang, signedIn);
  await context.addInitScript(cursorScript);
  if (app.insightsMode) await context.addInitScript(() => localStorage.setItem('researchpro_mode', 'advanced'));
  if (app.mask?.includes('shareLinks')) await context.addInitScript(maskLinksScript, MASKED_URL(lang));
  const page = await context.newPage();

  if (signedIn) {
    await page.goto(`${app.path}?lang=${lang}`);
    await page.waitForLoadState('networkidle');
    if (!(await page.locator('a[href="/settings"]').isVisible().catch(() => false))) {
      await signIn(page, lang);
      await context.storageState({path: statePath(lang)});
    }
  }
  await page.goto(`${app.path}?lang=${lang}`);
  await page.waitForLoadState('networkidle');
  const css = [STABLE_CSS, ...(app.mask ?? []).map((m) => MASK_CSS[m] ?? ''), app.css ?? ''].join('\n');
  await page.addStyleTag({content: css});
  if (app.ready) await locate(page, app.ready, lang).waitFor({state: 'visible'});
  for (const s of app.setup ?? []) await step(page, s, lang, false);
  await page.addStyleTag({content: css});
  await page.mouse.move(W / 2, H - 120);
  await page.evaluate(() => document.fonts.ready);
  await sleep(0.5);

  // On camera.
  fs.rmSync(workDir, {recursive: true, force: true});
  fs.mkdirSync(workDir, {recursive: true});
  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({data, metadata, sessionId}) => {
    const file = path.join(workDir, `f${String(frames.length).padStart(6, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({file, t: metadata.timestamp});
    await cdp.send('Page.screencastFrameAck', {sessionId}).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1});
  const t0 = Date.now() / 1000;
  for (const s of actions ?? []) await step(page, s, lang, true);
  const elapsed = Date.now() / 1000 - t0;
  if (elapsed < minSeconds) await sleep(minSeconds - elapsed);
  const seconds = Date.now() / 1000 - t0;
  await cdp.send('Page.stopScreencast');
  await context.close();

  if (writes.length) throw new Error(`A write would have left the browser: ${writes.join(', ')}`);
  if (!frames.length) throw new Error('No frame was recorded');

  // Each frame lasts until the next one; the last, until the end of the part.
  const start = frames[0].t;
  const lines = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t - start : seconds;
    const dur = Math.max(0.001, next - (f.t - start));
    lines.push(`file '${path.basename(f.file)}'`, `duration ${dur.toFixed(4)}`);
  });
  lines.push(`file '${path.basename(frames[frames.length - 1].file)}'`);
  fs.writeFileSync(path.join(workDir, 'frames.ffconcat'), `${lines.join('\n')}\n`);
  return seconds;
}
