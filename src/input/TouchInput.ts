/**
 * Touch-Steuerung für Mobile: virtueller Joystick (links) + 2 Buttons (rechts).
 *
 * Wird als DOM-Overlay über dem Spiel-Canvas angezeigt – damit ist sie
 * komplett unabhängig vom Renderer (Phaser/Three.js).
 * Styles stehen in index.html (#touch-controls).
 */
import type { Vec2 } from '../core/math';
import type { InputSource } from './InputManager';

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
}

export class TouchInput implements InputSource {
  private root: HTMLDivElement;
  private base: HTMLDivElement;
  private knob: HTMLDivElement;
  private move: Vec2 = { x: 0, y: 0 };
  private action = false;
  private burp = false;
  private joyPointer: number | null = null;
  private center: Vec2 = { x: 0, y: 0 };
  private readonly maxRadius = 50;
  private burpBtn: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    this.root.innerHTML = `
      <div class="joy-zone"><div class="joy-base"><div class="joy-knob"></div></div></div>
      <div class="btn-zone">
        <button class="tbtn tbtn-burp" aria-label="Rülpsen">💨<span>Rülpsen</span></button>
        <button class="tbtn tbtn-action" aria-label="Trinken / Essen">🍺<span>Trinken</span></button>
      </div>`;
    container.appendChild(this.root);

    const zone = this.root.querySelector('.joy-zone') as HTMLDivElement;
    this.base = this.root.querySelector('.joy-base') as HTMLDivElement;
    this.knob = this.root.querySelector('.joy-knob') as HTMLDivElement;
    const actionBtn = this.root.querySelector('.tbtn-action') as HTMLButtonElement;
    this.burpBtn = this.root.querySelector('.tbtn-burp') as HTMLButtonElement;

    zone.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);

    const press = (fn: () => void) => (e: Event) => { e.preventDefault(); e.stopPropagation(); fn(); };
    actionBtn.addEventListener('pointerdown', press(() => { this.action = true; }));
    this.burpBtn.addEventListener('pointerdown', press(() => { this.burp = true; }));
  }

  /** Zeigt dem Spieler, ob Rülpsen bereit ist (vom Renderer aufgerufen). */
  setBurpReady(ready: boolean): void {
    this.burpBtn.classList.toggle('cooldown', !ready);
  }

  setVisible(v: boolean): void {
    this.root.style.display = v ? '' : 'none';
    if (!v) this.reset();
  }

  private onDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.joyPointer = e.pointerId;
    const r = this.base.getBoundingClientRect();
    this.center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this.update(e);
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId === this.joyPointer) this.update(e);
  };

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId === this.joyPointer) this.reset();
  };

  private update(e: PointerEvent): void {
    let dx = e.clientX - this.center.x;
    let dy = e.clientY - this.center.y;
    const d = Math.hypot(dx, dy);
    if (d > this.maxRadius) { dx = (dx / d) * this.maxRadius; dy = (dy / d) * this.maxRadius; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // kleine Totzone
    const m = Math.min(1, d / this.maxRadius);
    this.move = m < 0.15 ? { x: 0, y: 0 } : { x: dx / this.maxRadius, y: dy / this.maxRadius };
  }

  private reset(): void {
    this.joyPointer = null;
    this.move = { x: 0, y: 0 };
    this.knob.style.transform = 'translate(0px, 0px)';
  }

  getMove(): Vec2 { return this.move; }

  consumeActions(): { action: boolean; burp: boolean } {
    const r = { action: this.action, burp: this.burp };
    this.action = false;
    this.burp = false;
    return r;
  }

  destroy(): void {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.root.remove();
  }
}
