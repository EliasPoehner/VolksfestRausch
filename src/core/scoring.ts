/**
 * Scoring & Uhr – reine Funktionen.
 */
import { ROUND, SCORING, SIDE_GOALS } from '../config/balance';

/**
 * Score aus Promille berechnen.
 * @param vomited vom Sanka abgeholt worden (halbiert den Score)
 * @param survivedVomits wie oft gekotzt, aber überstanden (jedes Mal ein Abzug)
 * @param goalsDone erfüllte Wiesn-Aufgaben (jede gibt einen Bonus)
 */
export function computeScore(promille: number, vomited: boolean, survivedVomits = 0, goalsDone = 0): number {
  const penalty = Math.max(SCORING.minVomitFactor, 1 - SCORING.perVomitPenalty * survivedVomits);
  const bonus = 1 + SIDE_GOALS.bonusEach * goalsDone;
  const raw = promille * penalty * bonus * (vomited ? SCORING.vomitScoreFactor : 1);
  return Math.round(raw * 100) / 100;
}

/** Titel für den Endscreen. */
export function titleFor(score: number, vomited: boolean): string {
  if (vomited) return SCORING.vomitTitle;
  return SCORING.titles.find((t) => score < t.maxScore)?.title ?? SCORING.titles[SCORING.titles.length - 1].title;
}

/** In-Game-Stunde (Dezimal, z. B. 19.5 = 19:30) für eine verstrichene Echtzeit. */
export function clockHour(elapsedSeconds: number): number {
  const t = Math.min(1, elapsedSeconds / ROUND.durationSeconds);
  return ROUND.startHour + t * (ROUND.endHour - ROUND.startHour);
}

/** "HH:MM" für die HUD-Uhr. */
export function clockLabel(elapsedSeconds: number): string {
  const h = clockHour(elapsedSeconds);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Promille hübsch formatieren: "1,42 ‰" */
export function formatPromille(p: number): string {
  return `${p.toFixed(2).replace('.', ',')} ‰`;
}
