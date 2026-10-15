/**
 * Audio über Howler.js – unabhängig vom Renderer.
 *
 * Alle Sounds liegen lokal unter public/assets/audio. Zum Austauschen einfach
 * die Datei ersetzen oder den Pfad unten anpassen (z. B. auf .ogg/.mp3).
 */
import { Howl, Howler } from 'howler';

export type SoundId =
  | 'gulp' | 'crunch' | 'burp' | 'burpFail' | 'warning' | 'vomit' | 'clink'
  | 'prost' | 'siren' | 'bump' | 'confetti' | 'click' | 'win' | 'whoosh';

/** Relative Pfade (funktionieren dank base: './' auch im Unterordner) */
const SFX: Record<SoundId, { src: string; volume: number }> = {
  gulp: { src: 'assets/audio/sfx_gulp.wav', volume: 0.7 },
  crunch: { src: 'assets/audio/sfx_crunch.wav', volume: 0.7 },
  burp: { src: 'assets/audio/sfx_burp.wav', volume: 0.9 },
  burpFail: { src: 'assets/audio/sfx_burp_fail.wav', volume: 0.9 },
  warning: { src: 'assets/audio/sfx_warning.wav', volume: 0.6 },
  vomit: { src: 'assets/audio/sfx_vomit.wav', volume: 0.9 },
  clink: { src: 'assets/audio/sfx_clink.wav', volume: 0.6 },
  prost: { src: 'assets/audio/sfx_prost.wav', volume: 0.6 },
  siren: { src: 'assets/audio/sfx_siren.wav', volume: 0.5 },
  bump: { src: 'assets/audio/sfx_bump.wav', volume: 0.7 },
  confetti: { src: 'assets/audio/sfx_confetti.wav', volume: 0.5 },
  click: { src: 'assets/audio/sfx_click.wav', volume: 0.5 },
  win: { src: 'assets/audio/sfx_win.wav', volume: 0.7 },
  whoosh: { src: 'assets/audio/sfx_whoosh.wav', volume: 0.5 },
};
const MUSIC = { src: 'assets/audio/music_blasmusik.wav', volume: 0.35 };
const MUTE_KEY = 'masskrug-marathon.muted';

class AudioManager {
  private sounds = new Map<SoundId, Howl>();
  private music: Howl | null = null;
  private _muted = false;
  private loaded = false;

  /** Lädt alle Sounds (einmalig). Fehler beim Laden werden ignoriert – das Spiel läuft auch stumm. */
  init(): void {
    if (this.loaded) return;
    this.loaded = true;
    try { this._muted = window.localStorage.getItem(MUTE_KEY) === '1'; } catch { /* egal */ }
    Howler.mute(this._muted);
    for (const [id, cfg] of Object.entries(SFX) as [SoundId, (typeof SFX)[SoundId]][]) {
      this.sounds.set(id, new Howl({ src: [cfg.src], volume: cfg.volume, preload: true }));
    }
    this.music = new Howl({ src: [MUSIC.src], volume: MUSIC.volume, loop: true, preload: true });
  }

  play(id: SoundId, opts: { rate?: number; volume?: number } = {}): void {
    const s = this.sounds.get(id);
    if (!s) return;
    const sid = s.play();
    if (opts.rate) s.rate(opts.rate, sid);
    if (opts.volume !== undefined) s.volume(opts.volume, sid);
  }

  startMusic(): void {
    if (this.music && !this.music.playing()) this.music.play();
  }

  stopMusic(): void { this.music?.stop(); }

  /** Musik "betrunken" machen: leicht verlangsamt und leiernd */
  setMusicWobble(amount: number): void {
    if (!this.music) return;
    this.music.rate(1 - Math.min(0.12, amount));
  }

  /** Lautstärke der Blasmusik (0–1), z. B. je Abend-Phase */
  setMusicVolume(volume: number, fadeMs = 1500): void {
    if (!this.music) return;
    if (this.music.playing()) this.music.fade(this.music.volume(), volume, fadeMs);
    else this.music.volume(volume);
  }

  get muted(): boolean { return this._muted; }

  toggleMute(): boolean {
    this._muted = !this._muted;
    Howler.mute(this._muted);
    try { window.localStorage.setItem(MUTE_KEY, this._muted ? '1' : '0'); } catch { /* egal */ }
    return this._muted;
  }
}

/** Globale Instanz */
export const audio = new AudioManager();
