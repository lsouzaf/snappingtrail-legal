// ffmpeg: each scene becomes one segment of the same shape (1920×1080, 30 fps, H.264, AAC 48 kHz
// stereo), its video (the recorded frames, the images in a cross-fade, or a card) with a short fade
// in and out, and its narration starting 0.4 s in, padded with silence to the scene's length. The
// segments are then joined without re-encoding. The subtitles come from the script's text, with the
// times of each scene.

import fs from 'node:fs';
import path from 'node:path';
import {ffmpeg} from './media.js';

export const LEAD = 0.4;
export const TAIL = 0.8;
const FPS = 30;
const BG = '0xF5F7FB';
const FIT = `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${BG},setsar=1`;
const VIDEO_OUT = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS)];

const fades = (d) => `fade=t=in:st=0:d=0.3,fade=t=out:st=${Math.max(0, d - 0.3).toFixed(3)}:d=0.3`;

/** The video of an app part: its recorded frames, held to [d] seconds. */
export function appVideo(workDir, d, out) {
  ffmpeg([
    '-f', 'concat', '-safe', '0', '-i', path.join(workDir, 'frames.ffconcat'),
    '-vf', `${FIT},fps=${FPS},tpad=stop_mode=clone:stop_duration=${d}`,
    '-t', d.toFixed(3), '-an', ...VIDEO_OUT, out,
  ]);
  return out;
}

/** The video of a still (a card): the image held for [d] seconds. */
export function stillVideo(image, d, out) {
  ffmpeg(['-loop', '1', '-framerate', String(FPS), '-i', image, '-vf', FIT, '-t', d.toFixed(3), '-an', ...VIDEO_OUT, out]);
  return out;
}

/** The video of several images, one after the other with a 0.6 s cross-fade, over [d] seconds. */
export function imagesVideo(images, d, out) {
  if (images.length === 1) return stillVideo(images[0], d, out);
  const x = 0.6;
  const each = (d + (images.length - 1) * x) / images.length;
  const inputs = images.flatMap((img) => ['-loop', '1', '-framerate', String(FPS), '-t', each.toFixed(3), '-i', img]);
  // A phone screen, centred on the page's background, a little smaller than the frame.
  const scale = `scale=-2:960,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${BG},setsar=1,fps=${FPS},format=yuv420p`;
  const chains = images.map((_, i) => `[${i}:v]${scale}[v${i}]`);
  let last = 'v0';
  for (let i = 1; i < images.length; i += 1) {
    const label = `x${i}`;
    chains.push(`[${last}][v${i}]xfade=transition=fade:duration=${x}:offset=${(i * (each - x)).toFixed(3)}[${label}]`);
    last = label;
  }
  ffmpeg([...inputs, '-filter_complex', chains.join(';'), '-map', `[${last}]`, '-t', d.toFixed(3), '-an', ...VIDEO_OUT, out]);
  return out;
}

/** Joins videos of the same shape, without re-encoding. */
export function concat(files, out, {copy = true} = {}) {
  const list = `${out}.txt`;
  fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f)}'`).join('\n'));
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, ...(copy ? ['-c', 'copy'] : []), out]);
  return out;
}

/** A scene's segment: its video with fades, and its narration (or silence) to [d] seconds. */
export function segment(video, voice, d, out) {
  const audio = voice
    ? ['-i', voice, '-filter:a', `adelay=${LEAD * 1000}:all=1,apad,atrim=0:${d.toFixed(3)}`]
    : ['-f', 'lavfi', '-t', d.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo'];
  ffmpeg([
    '-i', video, ...audio,
    '-map', '0:v', '-map', '1:a',
    '-vf', fades(d),
    ...VIDEO_OUT, '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
    '-t', d.toFixed(3), out,
  ]);
  return out;
}

const stamp = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

/** A text cut into subtitles of at most two lines of [max] characters, at sentence and word breaks. */
export function cues(text, max = 42) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && `${line} ${w}`.length > max) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
    if (/[.!?…:]$/.test(w) && line.length > max * 0.5) {
      lines.push(line);
      line = '';
    }
  }
  if (line) lines.push(line);
  const out = [];
  for (let i = 0; i < lines.length; i += 2) out.push(lines.slice(i, i + 2).join('\n'));
  return out;
}

/** The SRT of the scenes: each narration over its own time, split in proportion to the characters. */
export function srt(entries) {
  const blocks = [];
  for (const {start, seconds, text} of entries) {
    if (!text) continue;
    const parts = cues(text);
    const total = parts.reduce((n, p) => n + p.length, 0);
    let t = start + LEAD;
    for (const p of parts) {
      const d = (seconds * p.length) / total;
      blocks.push(`${blocks.length + 1}\n${stamp(t)} --> ${stamp(t + d)}\n${p}\n`);
      t += d;
    }
  }
  return blocks.join('\n');
}
