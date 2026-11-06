// A video's script: scripts/<video>.yml, a list of scenes (see README.md). Loaded once, and
// checked, so a mistake in the script fails before anything is recorded.

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const LANGS = ['en', 'pt'];

/** A text in the script: the same for both languages, or {en, pt}. */
export function pick(value, lang) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && lang in value) return value[lang];
  return value;
}

/** The parts a scene's screen is made of: the screen itself, or its `parts`. */
export function partsOf(scene) {
  return scene.screen.parts ?? [scene.screen];
}

export function loadScript(dir, video) {
  const file = path.join(dir, 'scripts', `${video}.yml`);
  if (!fs.existsSync(file)) throw new Error(`No script ${file}`);
  const script = YAML.parse(fs.readFileSync(file, 'utf8'), {merge: true});
  const problems = [];
  if (script.id !== video) problems.push(`id is "${script.id}", the file is "${video}"`);
  for (const lang of LANGS) if (!pick(script.title, lang)) problems.push(`no title in ${lang}`);
  const ids = new Set();
  for (const [i, scene] of (script.scenes ?? []).entries()) {
    const where = `scene ${i + 1} (${scene.id ?? 'no id'})`;
    if (!scene.id || !/^[a-z0-9-]+$/.test(scene.id)) problems.push(`${where}: an id of a-z, 0-9 and -`);
    if (ids.has(scene.id)) problems.push(`${where}: the id repeats`);
    ids.add(scene.id);
    if (!(scene.minDuration > 0)) problems.push(`${where}: minDuration in seconds`);
    if (scene.narration) {
      for (const lang of LANGS) if (!pick(scene.narration, lang)) problems.push(`${where}: no narration in ${lang}`);
    }
    if (!scene.screen) {
      problems.push(`${where}: no screen`);
      continue;
    }
    for (const part of partsOf(scene)) {
      const kinds = ['app', 'images', 'card'].filter((k) => part[k]);
      if (kinds.length !== 1) problems.push(`${where}: each screen is one of app, images or card`);
    }
  }
  if (!script.scenes?.length) problems.push('no scenes');
  if (problems.length) throw new Error(`${file}:\n  - ${problems.join('\n  - ')}`);
  return script;
}
