// An app scene, recorded: the tenant of the language, signed in with the captures' session (or
// signed in again, from the env file), the setup steps done off camera, then the actions on camera,
// with a visible cursor and smooth movements, held until the scene's time. The frames come from
// Chromium's screencast (sharper than Playwright's own video) and are written as JPEGs with an
// ffconcat list of their durations, which ffmpeg turns into the scene's video.
//
// The rules of the captures hold: nothing is written in DEV — any request to the API other than a
// read is refused and fails the scene, unless the script answers it in the browser with a simulated
// result (`fake`), so it never leaves —, the share links are masked, the QR codes blurred, the
// texts the script names (emails, prices, dates) blurred, and no trace, video or screenshot of the
// sign-in is kept.

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

/**
 * Blurs, on screen only, every element whose own text matches one of [patterns] (regular
 * expressions, as strings), as the screen changes: emails, prices, dates of billing.
 */
function blurTextScript(patterns) {
  const res = patterns.map((p) => new RegExp(p));
  const apply = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.dataset.blurred) continue;
      if (res.some((r) => r.test(n.textContent))) {
        el.dataset.blurred = '1';
        el.style.filter = 'blur(7px)';
      }
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
  else if (t.css) loc = root.locator(pick(t.css, lang));
  else loc = root.getByText(text, {exact: !!t.exact});
  if (t.hasText) loc = loc.filter({hasText: pick(t.hasText, lang)});
  if (t.visible) loc = loc.filter({visible: true});
  loc = loc.nth(t.nth ?? 0);
  if (t.parent) loc = loc.locator('xpath=..');
  // An insight's whole card, from its type chip.
  if (t.card) loc = loc.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
  // The nearest ancestor with that class (a section of a page, a table row).
  if (t.closest) loc = loc.locator(`xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ${t.closest} ")][1]`);
  return loc;
}

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/**
 * Moves the cursor to (x, y) in [seconds], eased. Paced by the clock, not by a count of steps: each
 * move takes a while with the screencast on, so the glide skips ahead when it falls behind.
 */
async function glideTo(page, x, y, seconds) {
  const from = await page.evaluate(() => [window.__cx ?? 960, window.__cy ?? 980]);
  const ms = Math.max(1, seconds * 1000);
  const t0 = Date.now();
  for (;;) {
    const f = Math.min(1, (Date.now() - t0) / ms);
    const k = ease(f);
    await page.mouse.move(from[0] + (x - from[0]) * k, from[1] + (y - from[1]) * k);
    if (f >= 1) break;
    await sleep(0.016);
  }
}

async function centerOf(locator) {
  await locator.waitFor({state: 'visible'});
  let box = await locator.boundingBox();
  // Out of the frame: brought into view first (a script should scroll to it, smoothly, before).
  if (box && (box.y < 0 || box.y + box.height > H || box.x < 0 || box.x + box.width > W)) {
    await locator.scrollIntoViewIfNeeded();
    box = await locator.boundingBox();
  }
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
  if (s.type) {
    // Typed key by key on camera (the cursor goes to the field first); filled at once off camera.
    const target = locate(page, s.type, lang);
    const text = pick(s.type.value, lang);
    if (!onCamera) return target.fill(text);
    const [x, y] = await centerOf(target);
    await glideTo(page, x, y, s.type.duration ?? 0.8);
    await target.click();
    await page.keyboard.type(text, {delay: s.type.delay ?? 55});
    return sleep(0.3);
  }
  if (s.fill) {
    // Set at once (a date, a number), after the cursor reaches the field on camera.
    const target = locate(page, s.fill, lang);
    if (onCamera) {
      const [x, y] = await centerOf(target);
      await glideTo(page, x, y, s.fill.duration ?? 0.8);
    }
    await target.fill(pick(s.fill.value, lang));
    return sleep(onCamera ? 0.4 : 0);
  }
  if (s.select) {
    const target = locate(page, s.select, lang);
    if (onCamera) {
      const [x, y] = await centerOf(target);
      await glideTo(page, x, y, s.select.duration ?? 0.8);
    }
    await target.selectOption(pick(s.select.value, lang));
    return sleep(onCamera ? 0.4 : 0);
  }
  if (s.press) {
    await page.keyboard.press(s.press);
    return sleep(onCamera ? 0.4 : 0.2);
  }
  if (s.attr) {
    // An attribute on an element, for a mask's CSS to find it (in a setup, off camera).
    const handle = await locate(page, s.attr, lang).elementHandle();
    return page.evaluate(({el, name, value}) => el.setAttribute(name, value), {el: handle, name: s.attr.name, value: s.attr.value ?? '1'});
  }
  if (s.waitUrl) return page.waitForURL(new RegExp(s.waitUrl));
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
  if (s.style) {
    // Inline styles on an element, as in `style: {…target, set: 'max-width: 860px'}` (in a setup, off camera).
    const handle = await locate(page, s.style, lang).elementHandle();
    return page.evaluate(({el, css}) => { el.style.cssText += `;${css}`; }, {el: handle, css: s.style.set});
  }
  if (s.zoom) {
    // The page scaled around a point chosen so the target ends up centred, and whole: a target that
    // would not fit the frame at that scale fails the scene.
    const box = await locate(page, s.zoom, lang).boundingBox();
    if (!box) throw new Error('zoom: nothing on screen');
    const scale = s.zoom.scale ?? 2;
    const margin = 40;
    if (box.width * scale > W - 2 * margin || box.height * scale > H - 2 * margin) {
      throw new Error(`zoom: the target (${Math.round(box.width)}×${Math.round(box.height)}) does not fit the frame at ${scale}×`);
    }
    const origin = (c, size) => Math.min(size, Math.max(0, (scale * c - size / 2) / (scale - 1)));
    const ms = (s.zoom.duration ?? 1.5) * 1000;
    await page.evaluate(
      ({x, y, scale, ms}) => {
        const root = document.body;
        root.style.transformOrigin = `${x}px ${y + window.scrollY}px`;
        root.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.2,1)`;
        root.style.transform = `scale(${scale})`;
      },
      {x: origin(box.x + box.width / 2, W), y: origin(box.y + box.height / 2, H), scale, ms},
    );
    await page.mouse.move(-50, -50);
    return sleep(ms / 1000 + 0.1);
  }
  throw new Error(`Unknown step ${JSON.stringify(s)}`);
}

/** Whose session a part records in: the account's administrator, or the demo interviewer. */
const USERS = {
  admin: {user: () => process.env.DOCS_USER, password: () => process.env.DOCS_PASSWORD, ready: 'a[href="/settings"]'},
  interviewer: {
    user: () => process.env.DOCS_INTERVIEWER_USER,
    password: () => process.env.DOCS_INTERVIEWER_PASSWORD,
    ready: 'a[href="/collect"]',
  },
};

const stateOf = (lang, who) => (who === 'admin' ? statePath(lang) : statePath(lang).replace(/\.json$/, `-${who}.json`));

export async function signIn(page, lang, who = 'admin') {
  const as = USERS[who];
  if (!as.user()) throw new Error(`No ${who} sign-in in the env file`);
  await page.goto(`/?lang=${lang}`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', {name: LOGIN[lang], exact: true}).filter({visible: true}).first().click();
  const menu = page.locator(as.ready);
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
    await form.locator('input[type="email"], input[name="username"]').first().fill(as.user());
    await form.locator('input[type="password"]').fill(as.password());
    await form.locator('button[type="submit"], input[type="submit"]').first().click();
  }
  await menu.waitFor({timeout: 45_000});
  await page.waitForLoadState('networkidle');
}

/**
 * A browser context in the language's tenant, signed in as [who] (or not), refusing every write to
 * the API — except those [fake] answers in the browser with a simulated result: {method, path (a
 * regular expression of the path), status, body (an object, or 'echo': the request's own JSON, less
 * [omit])}. Those never leave the browser. A GET in [fake] is read for real and changed in the
 * browser ([patch] over it, [omit] left out), so the screen agrees with what the scene simulated —
 * with [afterWrite], only once a write was simulated.
 */
export async function openContext(browser, lang, signedIn, {who = 'admin', fake = []} = {}) {
  const state = stateOf(lang, who);
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
  let simulated = 0;
  await context.route('**/*', async (route) => {
    const r = route.request();
    const pathname = new URL(r.url()).pathname;
    const answer = fake.find(
      (f) => f.method === r.method() && new RegExp(f.path).test(pathname) && (!f.afterWrite || simulated > 0),
    );
    if (answer && r.method() === 'GET') {
      // A read, changed in the browser to match what the scene simulated: the real answer, with
      // [patch] over it and [omit] left out.
      const real = await route.fetch();
      const body = {...(await real.json()), ...(answer.patch ?? {})};
      for (const k of answer.omit ?? []) delete body[k];
      return route.fulfill({response: real, json: body});
    }
    if (['GET', 'HEAD', 'OPTIONS'].includes(r.method())) return route.continue();
    if (answer) {
      simulated += 1;
      let body = answer.body ?? {};
      if (body === 'echo') {
        body = {...(r.postDataJSON() ?? {})};
        for (const k of answer.omit ?? []) delete body[k];
      }
      return route.fulfill({status: answer.status ?? 200, contentType: 'application/json', body: JSON.stringify(body)});
    }
    if (/\/(api|public)\//.test(pathname)) {
      writes.push(`${r.method()} ${pathname}`);
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
/**
 * The path of the survey's share link, for a respondent's part: read, off camera, in a session of
 * the account after [respondent.setup] (the survey's Share tab), from the screen's text or fields.
 */
async function shareLinkPath(browser, respondent, lang) {
  const {context, writes} = await openContext(browser, lang, true);
  const page = await context.newPage();
  await page.goto(`${respondent.path ?? '/projects'}?lang=${lang}`);
  await page.waitForLoadState('networkidle');
  if (!(await page.locator(USERS.admin.ready).isVisible().catch(() => false))) {
    await signIn(page, lang);
    await context.storageState({path: stateOf(lang, 'admin')});
    await page.goto(`${respondent.path ?? '/projects'}?lang=${lang}`);
    await page.waitForLoadState('networkidle');
  }
  for (const s of (respondent.setup ?? []).flat(Infinity)) await step(page, s, lang, false);
  const link = await page.evaluate(() => {
    const re = /https?:\/\/\S*?(\/s\/[A-Za-z0-9_-]+)/;
    const texts = [...document.querySelectorAll('input')].map((i) => i.value).concat(document.body.innerText);
    for (const t of texts) {
      const m = re.exec(t);
      if (m) return m[1];
    }
    return null;
  });
  await context.close();
  if (writes.length) throw new Error(`A write would have left the browser: ${writes.join(', ')}`);
  if (!link) throw new Error('No share link on the screen');
  return link;
}

export async function recordApp(browser, app, actions, lang, workDir, minSeconds) {
  // A respondent has no session at all, and opens the survey's link.
  const signedIn = app.signedIn !== false && !app.respondent;
  const who = app.user ?? 'admin';
  const appPath = app.respondent ? await shareLinkPath(browser, app.respondent, lang) : app.path;
  const at = `${appPath}${appPath.includes('?') ? '&' : '?'}lang=${lang}`;
  const {context, writes} = await openContext(browser, lang, signedIn, {who, fake: app.fake ?? []});
  await context.addInitScript(cursorScript);
  if (app.insightsMode) await context.addInitScript(() => localStorage.setItem('researchpro_mode', 'advanced'));
  if (app.mask?.includes('shareLinks')) await context.addInitScript(maskLinksScript, MASKED_URL(lang));
  if (app.blurText?.length) await context.addInitScript(blurTextScript, app.blurText);
  const page = await context.newPage();

  if (signedIn) {
    await page.goto(at);
    await page.waitForLoadState('networkidle');
    if (!(await page.locator(USERS[who].ready).isVisible().catch(() => false))) {
      await signIn(page, lang, who);
      await context.storageState({path: stateOf(lang, who)});
    }
  }
  await page.goto(at);
  await page.waitForLoadState('networkidle');
  const css = [STABLE_CSS, ...(app.mask ?? []).map((m) => MASK_CSS[m] ?? ''), app.css ?? ''].join('\n');
  await page.addStyleTag({content: css});
  if (app.ready) await locate(page, app.ready, lang).waitFor({state: 'visible'});
  // A setup can join the steps of several YAML anchors: lists of lists, flattened.
  for (const s of (app.setup ?? []).flat(Infinity)) await step(page, s, lang, false);
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
  for (const s of (actions ?? []).flat(Infinity)) await step(page, s, lang, true);
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
