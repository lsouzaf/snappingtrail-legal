// The narration of each scene, in each language. The final voice (ElevenLabs) lives in
// voice/<video>/<lang>/<scene>.mp3 (or .wav); a scene without it gets the provisional voice,
// espeak-ng, made in the work folder — only to set the timing. See README.md.

import fs from 'node:fs';
import path from 'node:path';
import {duration, run} from './media.js';

const ESPEAK = {en: {voice: 'en-us', speed: '160'}, pt: {voice: 'pt-br', speed: '155'}};

/** The final voice of a scene, when there is one. */
export function finalVoice(dir, video, lang, scene) {
  for (const ext of ['mp3', 'wav', 'm4a']) {
    const file = path.join(dir, 'voice', video, lang, `${scene}.${ext}`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

/** {file, seconds, provisional} of a scene's narration, or null when it has none. */
export function narration(dir, work, video, lang, scene, text) {
  if (!text) return null;
  const final = finalVoice(dir, video, lang, scene);
  if (final) return {file: final, seconds: duration(final), provisional: false};
  const file = path.join(work, 'voice', `${scene}.wav`);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const {voice, speed} = ESPEAK[lang];
  run('espeak-ng', ['-v', voice, '-s', speed, '-w', file, text]);
  return {file, seconds: duration(file), provisional: true};
}
