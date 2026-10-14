/**
 * Tastatur-Eingabe über DOM-Events (WASD/Pfeile, E/Leertaste, R).
 */
import type { Vec2 } from '../core/math';
import type { InputSource } from './InputManager';

const UP = ['KeyW', 'ArrowUp'];
const DOWN = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];
const ACTION = ['KeyE', 'Space', 'Enter'];
const BURP = ['KeyR'];
const ALL = [...UP, ...DOWN, ...LEFT, ...RIGHT, ...ACTION, ...BURP];

export class KeyboardInput implements InputSource {
  private down = new Set<string>();
  private action = false;
  private burp = false;

  private onKeyDown = (e: KeyboardEvent): void => {
    if (ALL.includes(e.code)) e.preventDefault(); // kein Scrollen mit Leertaste/Pfeilen
    if (e.repeat) return;
    this.down.add(e.code);
    if (ACTION.includes(e.code)) this.action = true;
    if (BURP.includes(e.code)) this.burp = true;
  };
  private onKeyUp = (e: KeyboardEvent): void => { this.down.delete(e.code); };
  private onBlur = (): void => { this.down.clear(); };

  constructor(private target: Window = window) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  private any(codes: string[]): boolean { return codes.some((c) => this.down.has(c)); }

  getMove(): Vec2 {
    const x = (this.any(RIGHT) ? 1 : 0) - (this.any(LEFT) ? 1 : 0);
    const y = (this.any(DOWN) ? 1 : 0) - (this.any(UP) ? 1 : 0);
    return { x, y };
  }

  consumeActions(): { action: boolean; burp: boolean } {
    const r = { action: this.action, burp: this.burp };
    this.action = false;
    this.burp = false;
    return r;
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}
