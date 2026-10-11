#!/usr/bin/env node
/**
 * Step 2 of the voice pipeline: turn voice/lines.json into audio files + manifest.
 *
 *   npm run voice            # export lines, then generate with the default engine
 *   VOICE_ENGINE=piper PIPER_MODEL=/path/vi_VN-vais1000-medium.onnx npm run voice:generate
 *   VOICE_ENGINE=khanhtts KHANHTTS_DIR=/path/vietnamese-tts-studio npm run voice:generate
 *
 * Engines (all free, all local, no API keys):
 *   espeak   — eSpeak NG (GPL-3.0), Vietnamese voices vi / vi-vn-x-central / vi-vn-x-south.
 *              Robotic but intelligible, tiny, CPU-only. Works in this repo's CI/container.
 *   piper    — Piper TTS + a Vietnamese .onnx voice (download from rhasspy/piper-voices on
 *              HuggingFace yourself; check each voice's MODEL_CARD licence before shipping).
 *   khanhtts — vuhai2002/vietnamese-tts-studio (KhanhTTS-OmniVoice, Apache-2.0 model);
 *              needs Python 3.12 + PyTorch, ~3 GB model, GPU strongly recommended.
 *
 * Output: public/voice/<speaker>/<hash>.mp3 (mono 22 kHz MP3), public/voice/manifest.json,
 * voice/missing.txt (lines that failed), voice/report.json. Existing files are reused
 * (hash of engine + voice + text), so re-running only renders new or changed lines.
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = join(ROOT, 'public', 'voice');
const ENGINE = process.env.VOICE_ENGINE ?? 'espeak';
const FORCE = process.argv.includes('--force');
const LIMIT = Number(process.env.VOICE_LIMIT ?? 0) || Infinity;
const JOBS = Number(process.env.VOICE_JOBS ?? 4);
const TMP = join(tmpdir(), `tctbo-voice-${process.pid}`);
mkdirSync(TMP, { recursive: true });

const lines = JSON.parse(readFileSync(join(ROOT, 'voice', 'lines.json'), 'utf8')).slice(0, LIMIT);

/** Synthesize one line to a WAV file with the chosen engine. */
async function synth(line, wav) {
  const v = line.voice;
  if (ENGINE === 'espeak') {
    await run('espeak-ng', ['-v', `${v.espeak}+${v.variant}`, '-p', String(v.pitch), '-s', String(v.speed), '-w', wav, line.say]);
  } else if (ENGINE === 'piper') {
    const model = process.env.PIPER_MODEL;
    if (!model || !existsSync(model)) throw new Error('PIPER_MODEL must point to a Vietnamese .onnx voice');
    // Characters differ by speaking rate (length_scale); pitch is left alone to keep tones clear.
    const lengthScale = (165 / v.speed).toFixed(2);
    const child = execFile(process.env.PIPER_BIN ?? 'piper', ['--model', model, '--length_scale', lengthScale, '--output_file', wav]);
    child.stdin.end(line.say);
    await new Promise((ok, fail) => child.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`piper exited ${code}`)))));
  } else if (ENGINE === 'khanhtts') {
    const dir = process.env.KHANHTTS_DIR;
    if (!dir) throw new Error('KHANHTTS_DIR must point to a vietnamese-tts-studio checkout');
    // Optional per-speaker reference voice for cloning: voice/refs/<speaker>.wav (+ .txt transcript).
    const ref = join(ROOT, 'voice', 'refs', `${line.speaker}.wav`);
    const args = ['run', 'python', 'run.py', '--text', line.say, '--out', wav, '--speed', (v.speed / 165).toFixed(2)];
    if (existsSync(ref)) args.push('--ref', ref);
    await run('uv', args, { cwd: dir, timeout: 600000 });
  } else {
    throw new Error(`Unknown VOICE_ENGINE ${ENGINE}`);
  }
}

/** Trim silence, normalise loudness, encode small mono MP3. */
async function encode(wav, mp3) {
  await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', wav,
    '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-18:TP=-2:LRA=11',
    '-ar', '22050', '-ac', '1', '-b:a', '32k', mp3,
  ]);
}

/** A file is good if it decodes, has a plausible length and is not silent. */
async function check(mp3) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]);
  const duration = Number(stdout.trim());
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', mp3, '-af', 'volumedetect', '-f', 'null', '-']);
  const mean = Number(/mean_volume: (-?[\d.]+) dB/.exec(stderr)?.[1] ?? -99);
  const ok = duration > 0.25 && duration < 20 && mean > -45;
  return { ok, duration: Math.round(duration * 100) / 100, mean };
}

const manifest = [];
const missing = [];
let made = 0;
let reused = 0;

async function work(line, i) {
  const hash = createHash('sha1').update(`${ENGINE}|${JSON.stringify(line.voice)}|${line.say}`).digest('hex').slice(0, 12);
  const rel = `voice/${line.speaker}/${hash}.mp3`;
  const mp3 = join(ROOT, 'public', rel);
  mkdirSync(join(OUT, line.speaker), { recursive: true });
  try {
    if (FORCE || !existsSync(mp3) || statSync(mp3).size < 500) {
      const wav = join(TMP, `${i}.wav`);
      await synth(line, wav);
      await encode(wav, mp3);
      rmSync(wav, { force: true });
      made++;
    } else reused++;
    const q = await check(mp3);
    if (!q.ok) throw new Error(`bad audio (duration ${q.duration}s, mean ${q.mean} dB)`);
    manifest.push({ id: hash, speaker: line.speaker, event: line.event, text: line.text, file: rel, duration: q.duration });
  } catch (e) {
    missing.push(`${line.speaker}\t${line.event}\t${line.text}\t${e.message}`);
    rmSync(mp3, { force: true });
  }
}

const queue = lines.map((l, i) => () => work(l, i));
await Promise.all(
  Array.from({ length: JOBS }, async () => {
    while (queue.length) await queue.shift()();
  }),
);

// Remove files no longer referenced (lines edited or removed).
const keep = new Set(manifest.map((m) => join(ROOT, 'public', m.file)));
let pruned = 0;
if (LIMIT === Infinity) {
  for (const sp of existsSync(OUT) ? readdirSync(OUT) : []) {
    const dir = join(OUT, sp);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) if (!keep.has(join(dir, f))) (rmSync(join(dir, f)), pruned++);
  }
}

manifest.sort((a, b) => (a.speaker + a.event + a.text).localeCompare(b.speaker + b.event + b.text));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ engine: ENGINE, generatedAt: new Date().toISOString(), lines: manifest }));
writeFileSync(join(ROOT, 'voice', 'missing.txt'), missing.join('\n') + (missing.length ? '\n' : ''));
const bytes = manifest.reduce((a, m) => a + statSync(join(ROOT, 'public', m.file)).size, 0);
const report = { engine: ENGINE, lines: lines.length, ok: manifest.length, missing: missing.length, rendered: made, reused, pruned, totalMB: Math.round(bytes / 1e5) / 10 };
writeFileSync(join(ROOT, 'voice', 'report.json'), JSON.stringify(report, null, 1) + '\n');
rmSync(TMP, { recursive: true, force: true });
console.log(report);
if (missing.length) {
  console.log(`${missing.length} line(s) failed — see voice/missing.txt`);
  process.exitCode = 1;
}
