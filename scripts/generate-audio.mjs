#!/usr/bin/env node
/**
 * Erzeugt alle Sounds des Spiels prozedural (additive Synthese) als WAV.
 *
 *   npm run gen:audio
 *
 * Ergebnis: public/assets/audio/*.wav
 * Die Dateien sind Eigenproduktionen (CC0) und können jederzeit durch
 * "echte" Aufnahmen (z. B. von Freesound.org, CC0) mit gleichem Dateinamen
 * ersetzt werden – das Spiel lädt sie über src/audio/sounds.ts.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050; // Samplerate – reicht für Retro-Sounds und hält die Dateien klein
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'audio');
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

/** Deterministisches Rauschen, damit die Dateien reproduzierbar sind */
let seed = 1234567;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rand() * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SR));

/** ADSR-ähnliche Hüllkurve (Attack, Decay auf Sustain, Release am Ende) */
function env(t, dur, a = 0.01, d = 0.1, s = 0.6, r = 0.05) {
  if (t < 0 || t > dur) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t > dur - r) return s * Math.max(0, (dur - t) / r);
  return s;
}

/** Additiver Ton mit Obertönen (amps[i] = Amplitude des (i+1)-ten Obertons) */
function tone(buf, start, dur, freq, amps, vol, envFn, vibrato = 0) {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let phase = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / SR;
    const f = freq * (1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t * 4));
    phase += (2 * Math.PI * f) / SR;
    let v = 0;
    for (let h = 0; h < amps.length; h++) v += amps[h] * Math.sin(phase * (h + 1));
    buf[s0 + i] += v * vol * envFn(t, dur);
  }
}

function noiseBurst(buf, start, dur, vol, lp = 0.5, envFn = (t, d) => Math.exp(-t * 30) * (t < d ? 1 : 0)) {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let y = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    y += lp * (noise() - y);
    buf[s0 + i] += y * vol * envFn(i / SR, dur);
  }
}

/** Hochpass (einpolig) für Becken etc. */
function highpassNoise(buf, start, dur, vol, decay) {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let prev = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const x = noise();
    buf[s0 + i] += (x - prev) * 0.5 * vol * Math.exp(-(i / SR) * decay);
    prev = x;
  }
}

function lowpass(buf, a) {
  let y = 0;
  for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; }
  return buf;
}

function normalize(buf, peak = 0.9) {
  let m = 0;
  for (const v of buf) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh((buf[i] / m) * 1.2) * peak;
  return buf;
}

function writeWav(name, buf) {
  const data = Buffer.alloc(44 + buf.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + buf.length * 2, 4); data.write('WAVE', 8);
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(buf.length * 2, 40);
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
  writeFileSync(join(OUT, name), data);
  console.log(`  ${name}  ${(data.length / 1024).toFixed(0)} KB`);
}

// Instrument-Klangfarben (Obertonspektren)
const TUBA = [1, 0.5, 0.25, 0.12, 0.05];
const BRASS = [1, 0.8, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08];
const CLARINET = [1, 0.05, 0.45, 0.03, 0.25, 0.02, 0.1];

// ---------------------------------------------------------------------------
// Blasmusik-Loop (Polka in F-Dur, 2/4, 16 Takte)
// ---------------------------------------------------------------------------
function blasmusik() {
  const bpm = 132;
  const beat = 60 / bpm;
  const eighth = beat / 2;
  const bars = 16;
  const total = bars * 2 * beat;
  const buf = buffer(total);

  const chords = ['F', 'F', 'C7', 'C7', 'C7', 'C7', 'F', 'F', 'F', 'F', 'Bb', 'Bb', 'F', 'C7', 'F', 'F'];
  const bass = { F: [41, 36], C7: [36, 43], Bb: [34, 41] };
  const voicing = { F: [57, 60, 65], C7: [55, 58, 64], Bb: [58, 62, 65] };
  // Melodie: [MIDI-Note | null für Pause, Länge in Achteln] je Takt (4 Achtel pro Takt)
  const melody = [
    [[72, 1], [77, 1], [76, 1], [77, 1]], [[81, 2], [77, 2]],
    [[76, 1], [79, 1], [82, 1], [79, 1]], [[76, 2], [72, 2]],
    [[70, 1], [72, 1], [74, 1], [76, 1]], [[79, 2], [76, 2]],
    [[77, 1], [76, 1], [77, 1], [79, 1]], [[81, 3], [null, 1]],
    [[72, 1], [77, 1], [76, 1], [77, 1]], [[81, 2], [84, 2]],
    [[82, 1], [81, 1], [79, 1], [77, 1]], [[74, 2], [77, 2]],
    [[81, 1], [79, 1], [77, 1], [76, 1]], [[79, 2], [76, 2]],
    [[77, 2], [72, 2]], [[77, 3], [null, 1]],
  ];

  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 2 * beat;
    const c = chords[bar];
    // Umm-pa, Umm-pa
    for (let b = 0; b < 2; b++) {
      const tb = t0 + b * beat;
      tone(buf, tb, beat * 0.55, midi(bass[c][b]), TUBA, 0.55, (t, d) => env(t, d, 0.015, 0.12, 0.7, 0.06));
      noiseBurst(buf, tb, 0.12, 0.35, 0.08); // Basstrommel
      for (const n of voicing[c]) {
        tone(buf, tb + eighth, eighth * 0.7, midi(n), BRASS, 0.09, (t, d) => env(t, d, 0.01, 0.05, 0.6, 0.04));
      }
      highpassNoise(buf, tb + eighth, 0.15, 0.18, 28); // Becken "tsching"
    }
    // Melodie (Trompete + Klarinette eine Oktave höher, leise)
    let te = t0;
    for (const [note, len] of melody[bar]) {
      const d = len * eighth;
      if (note !== null) {
        tone(buf, te, d * 0.92, midi(note), BRASS, 0.2, (t, dd) => env(t, dd, 0.02, 0.08, 0.75, 0.05), 0.008);
        tone(buf, te, d * 0.92, midi(note + 12), CLARINET, 0.05, (t, dd) => env(t, dd, 0.03, 0.08, 0.7, 0.05), 0.01);
      }
      te += d;
    }
  }
  return normalize(buf, 0.8);
}

// ---------------------------------------------------------------------------
// Soundeffekte
// ---------------------------------------------------------------------------

function gulp() {
  const buf = buffer(0.55);
  for (let k = 0; k < 3; k++) {
    const s0 = Math.floor(k * 0.16 * SR);
    const n = Math.floor(0.12 * SR);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 180 + 420 * (t / 0.12);
      ph += (2 * Math.PI * f) / SR;
      buf[s0 + i] += Math.sin(ph) * Math.sin(Math.PI * t / 0.12) * 0.8;
    }
  }
  return normalize(lowpass(buf, 0.4), 0.7);
}

function crunch() {
  const buf = buffer(0.5);
  for (let k = 0; k < 4; k++) noiseBurst(buf, k * 0.11 + rand() * 0.02, 0.08, 1, 0.7, (t) => Math.exp(-t * 45));
  return normalize(buf, 0.6);
}

function burpSound(len = 0.75, f0 = 85) {
  const buf = buffer(len);
  let ph = 0;
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const f = f0 * (1 + 0.25 * Math.sin(t * 9)) * (1 - 0.25 * t / len) + noise() * 6;
    ph += (2 * Math.PI * f) / SR;
    const saw = ((ph / (2 * Math.PI)) % 1) * 2 - 1;
    const am = 0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 23) * Math.sin(t * 7);
    const e = Math.min(1, t * 25) * Math.min(1, (len - t) * 6);
    y += 0.12 * (saw * am + noise() * 0.25 - y);
    buf[i] = y * e;
  }
  return normalize(buf, 0.85);
}

function burpFail() {
  const b = burpSound(0.35, 110);
  const buf = buffer(1.2);
  buf.set(b, 0);
  // traurige Posaune: wah-wah
  tone(buf, 0.4, 0.3, midi(58), BRASS, 0.3, (t, d) => env(t, d, 0.02, 0.05, 0.7, 0.05), 0.01);
  tone(buf, 0.72, 0.45, midi(55), BRASS, 0.3, (t, d) => env(t, d, 0.02, 0.05, 0.7, 0.1), 0.03);
  return normalize(buf, 0.75);
}

function warning() {
  const buf = buffer(0.7);
  tone(buf, 0, 0.15, 880, [1, 0, 0.3, 0, 0.15], 0.5, (t, d) => env(t, d, 0.005, 0.02, 0.9, 0.02));
  tone(buf, 0.2, 0.15, 660, [1, 0, 0.3, 0, 0.15], 0.5, (t, d) => env(t, d, 0.005, 0.02, 0.9, 0.02));
  tone(buf, 0.4, 0.25, 520, [1, 0, 0.3, 0, 0.15], 0.5, (t, d) => env(t, d, 0.005, 0.02, 0.9, 0.05));
  return normalize(buf, 0.6);
}

function vomit() {
  const len = 1.6;
  const buf = buffer(len);
  let ph = 0, y = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const f = 220 * Math.exp(-t * 1.1) + 60;
    ph += (2 * Math.PI * f) / SR;
    const saw = ((ph / (2 * Math.PI)) % 1) * 2 - 1;
    const gurgle = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * (14 + 6 * Math.sin(t * 3)));
    const e = Math.min(1, t * 12) * Math.min(1, (len - t) * 2.5);
    y += 0.25 * (saw * 0.6 + noise() * 0.8 * gurgle - y);
    buf[i] = y * e;
  }
  // Platsch am Ende
  noiseBurst(buf, 1.1, 0.4, 1.2, 0.3, (t) => Math.exp(-t * 9));
  return normalize(buf, 0.85);
}

function clink() {
  const buf = buffer(1.0);
  const bell = (start, f) => {
    tone(buf, start, 0.9, f, [1], 0.5, (t) => Math.exp(-t * 6));
    tone(buf, start, 0.9, f * 2.76, [1], 0.25, (t) => Math.exp(-t * 9));
    tone(buf, start, 0.9, f * 5.4, [1], 0.12, (t) => Math.exp(-t * 14));
  };
  bell(0, 1650);
  bell(0.09, 1980);
  return normalize(buf, 0.6);
}

function cheer() {
  // "Prost!"-Fanfare: kurzes Dur-Arpeggio
  const buf = buffer(0.9);
  [65, 69, 72, 77].forEach((n, i) => {
    tone(buf, i * 0.09, i === 3 ? 0.5 : 0.12, midi(n), BRASS, 0.3, (t, d) => env(t, d, 0.01, 0.05, 0.7, 0.05), 0.01);
  });
  return normalize(buf, 0.65);
}

function siren() {
  // Tatü-tata (ca. 440 Hz / 585 Hz)
  const buf = buffer(2.6);
  for (let k = 0; k < 4; k++) {
    tone(buf, k * 0.65, 0.62, k % 2 === 0 ? 440 : 585, [1, 0, 0.33, 0, 0.2, 0, 0.14], 0.4, (t, d) => env(t, d, 0.02, 0.05, 0.9, 0.03));
  }
  return normalize(buf, 0.55);
}

function bump() {
  const buf = buffer(0.5);
  noiseBurst(buf, 0, 0.15, 1, 0.1, (t) => Math.exp(-t * 25));
  let ph = 0;
  for (let i = 0; i < 0.45 * SR; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (300 + 120 * Math.sin(t * 40) * Math.exp(-t * 4))) / SR;
    buf[i] += Math.sin(ph) * Math.exp(-t * 6) * 0.5;
  }
  return normalize(buf, 0.6);
}

function pop() {
  const buf = buffer(0.8);
  noiseBurst(buf, 0, 0.06, 1, 0.9, (t) => Math.exp(-t * 60));
  [84, 88, 91, 96].forEach((n, i) => tone(buf, 0.05 + i * 0.07, 0.3, midi(n), [1, 0.2], 0.25, (t) => Math.exp(-t * 12)));
  return normalize(buf, 0.55);
}

function click() {
  const buf = buffer(0.08);
  tone(buf, 0, 0.08, 1200, [1, 0.3], 0.6, (t) => Math.exp(-t * 60));
  return normalize(buf, 0.5);
}

function win() {
  const buf = buffer(2.2);
  const seq = [[65, 0.18], [69, 0.18], [72, 0.18], [77, 0.4], [72, 0.18], [77, 1.0]];
  let t0 = 0;
  for (const [n, d] of seq) {
    tone(buf, t0, d * 0.95, midi(n), BRASS, 0.35, (t, dd) => env(t, dd, 0.02, 0.06, 0.75, 0.08), 0.012);
    tone(buf, t0, d * 0.95, midi(n - 12), TUBA, 0.3, (t, dd) => env(t, dd, 0.02, 0.06, 0.75, 0.08));
    t0 += d;
  }
  return normalize(buf, 0.75);
}

function whoosh() {
  const len = 1.0;
  const buf = buffer(len);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const a = 0.02 + 0.25 * Math.sin(Math.PI * t / len);
    y += a * (noise() - y);
    buf[i] = y * Math.sin(Math.PI * t / len);
  }
  return normalize(buf, 0.5);
}

// ---------------------------------------------------------------------------

console.log('Erzeuge Audio nach', OUT);
writeWav('music_blasmusik.wav', blasmusik());
writeWav('sfx_gulp.wav', gulp());
writeWav('sfx_crunch.wav', crunch());
writeWav('sfx_burp.wav', burpSound());
writeWav('sfx_burp_fail.wav', burpFail());
writeWav('sfx_warning.wav', warning());
writeWav('sfx_vomit.wav', vomit());
writeWav('sfx_clink.wav', clink());
writeWav('sfx_prost.wav', cheer());
writeWav('sfx_siren.wav', siren());
writeWav('sfx_bump.wav', bump());
writeWav('sfx_confetti.wav', pop());
writeWav('sfx_click.wav', click());
writeWav('sfx_win.wav', win());
writeWav('sfx_whoosh.wav', whoosh());
console.log('Fertig.');
