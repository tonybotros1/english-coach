import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { toAzureWav } from '@/lib/audio';
import { normalizeAssessment } from '@/lib/azureSpeech';

/** Makes a short stereo 44.1 kHz AAC .m4a, like the phones record. */
function makeM4a(seconds: number): Buffer {
  const dir = mkdtempSync(join(tmpdir(), 'ec-test-'));
  const out = join(dir, 'sample.m4a');
  const r = spawnSync(ffmpegPath!, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}:sample_rate=44100`,
    '-ac', '2', '-c:a', 'aac', '-b:a', '128k', out,
  ]);
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return readFileSync(out);
}

describe('audio conversion for Azure', () => {
  it('turns a phone-style m4a into 16 kHz mono 16-bit WAV', async () => {
    const { wav, seconds } = await toAzureWav(makeM4a(2), 'm4a');
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    expect(wav.readUInt16LE(22)).toBe(1); // channels
    expect(wav.readUInt32LE(24)).toBe(16000); // sample rate
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
    expect(seconds).toBeGreaterThan(1.8);
    expect(seconds).toBeLessThan(2.2);
  });

  it('cuts recordings to the 30-second Azure limit', async () => {
    const { seconds } = await toAzureWav(makeM4a(33), 'm4a');
    expect(seconds).toBeLessThanOrEqual(30.05);
  });

  it('rejects files that are not audio', async () => {
    await expect(toAzureWav(Buffer.from('definitely not audio'), 'm4a')).rejects.toMatchObject({ status: 400 });
  });
});

describe('reading Azure pronunciation results', () => {
  it('reads the flat shape from the REST documentation', () => {
    const a = normalizeAssessment({
      RecognitionStatus: 'Success',
      DisplayText: 'Good morning.',
      NBest: [{ AccuracyScore: 100, FluencyScore: 95.5, CompletenessScore: 100, ProsodyScore: 88.24, PronScore: 95.4,
        Words: [{ Word: 'good', AccuracyScore: 100, ErrorType: 'None' }, { Word: 'morning', AccuracyScore: 52, ErrorType: 'Mispronunciation' }] }],
    });
    expect(a.scores).toEqual({ pronunciation: 95.4, accuracy: 100, fluency: 95.5, completeness: 100, prosody: 88.2 });
    expect(a.words[1]).toEqual({ word: 'morning', accuracy: 52, errorType: 'Mispronunciation' });
    expect(a.recognized).toBe('Good morning.');
  });

  it('reads the nested shape from the how-to guide', () => {
    const a = normalizeAssessment({
      RecognitionStatus: 0,
      NBest: [{ Display: 'Hello.', PronunciationAssessment: { AccuracyScore: 80, FluencyScore: 70, CompletenessScore: 100, PronScore: 79 },
        Words: [{ Word: 'hello', PronunciationAssessment: { AccuracyScore: 80, ErrorType: 'None' } }] }],
    });
    expect(a.status).toBe('Success');
    expect(a.scores.pronunciation).toBe(79);
    expect(a.scores.prosody).toBeNull();
    expect(a.words[0].accuracy).toBe(80);
    expect(a.recognized).toBe('Hello.');
  });

  it('copes with no speech recognised', () => {
    const a = normalizeAssessment({ RecognitionStatus: 'NoMatch' });
    expect(a.status).toBe('NoMatch');
    expect(a.words).toEqual([]);
    expect(a.scores.accuracy).toBeNull();
  });
});
