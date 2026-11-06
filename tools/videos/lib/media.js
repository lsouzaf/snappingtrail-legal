// ffmpeg, ffprobe and espeak-ng, run without a shell; a failure throws with the tool's own output.

import {spawnSync} from 'node:child_process';

export function run(bin, args) {
  const r = spawnSync(bin, args, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  if (r.status !== 0) {
    throw new Error(`${bin} failed (${r.status}):\n${(r.stderr || r.stdout || '').slice(-3000)}`);
  }
  return r.stdout;
}

export function ffmpeg(args) {
  return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
}

/** A media file's duration, in seconds. */
export function duration(file) {
  const out = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number.parseFloat(out.trim());
}
