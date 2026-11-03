import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { HttpError } from './errors';

/** Azure pronunciation assessment accepts at most 30 seconds of audio. */
export const MAX_ASSESS_SECONDS = 30;
const SAMPLE_RATE = 16000;
const BYTES_PER_SECOND = SAMPLE_RATE * 2; // 16-bit mono

/**
 * Converts any recording the phones produce (m4a on iOS and Android, 3gp, wav, webm)
 * into 16 kHz mono 16-bit PCM WAV, the format Azure's short-audio API expects.
 * Uses temp files because m4a needs a seekable input.
 */
export async function toAzureWav(input: Buffer, extension = 'm4a'): Promise<{ wav: Buffer; seconds: number }> {
  if (!ffmpegPath) throw new Error('ffmpeg is not available on this server.');
  if (input.length === 0) throw new HttpError(400, 'The recording is empty. Record again.', 'empty_audio');
  const dir = await mkdtemp(join(tmpdir(), 'ec-audio-'));
  const ext = extension.replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'm4a';
  const inFile = join(dir, `in.${ext}`);
  const outFile = join(dir, 'out.wav');
  try {
    await writeFile(inFile, input);
    await run(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', inFile,
      '-ac', '1', '-ar', String(SAMPLE_RATE), '-sample_fmt', 's16', '-acodec', 'pcm_s16le',
      '-t', String(MAX_ASSESS_SECONDS),
      outFile,
    ]);
    const wav = await readFile(outFile);
    const seconds = Math.max(0, (wav.length - 44) / BYTES_PER_SECOND);
    if (seconds < 0.3) throw new HttpError(400, 'The recording is too short. Hold the button and speak the full sentence.', 'audio_too_short');
    return { wav, seconds: Math.round(seconds * 100) / 100 };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new HttpError(400, 'The recording could not be read. Try recording again.', 'bad_audio'));
      if (code !== 0) console.error('ffmpeg failed:', err.slice(0, 500));
    });
  });
}
