# Maßkrug-Marathon – Plan für die nächsten Schritte

## Kontext (für einen neuen Chat)

Repo: `eliaspoehner/volksfestrausch`, Branch `claude/blissful-cannon-phh4ur` (Schritt 1 weiter auf `claude/admiring-einstein-mtqp81`).
Spiel: 2D-Volksfest-Browserspiel (Vite + TypeScript + Phaser 3). Ziel: bis 23:00 (180 s Echtzeit) so viel Promille wie möglich, ohne dass der Sanka kommt.

**Architektur:** Die Logik ist renderer-unabhängig (`src/core/`, `GameState.step(dt, cmd)`). Alle Zahlen stehen in `src/config/balance.ts`. Die Phaser-Szenen (`src/render/scenes/`) lesen nur den Zustand und spielen Events aus `GameState.events` ab. Tests: `npm test` (Vitest, `tests/core.test.ts`), Typecheck: `npm run typecheck`.

**Bereits umgesetzt (Commit `b3f1daa`):**
- **A – Kotzen als Ereignis:** Beim ersten und zweiten Kotzen läuft das Spiel weiter. Promille ×0,65, Kotzleiste auf 30 bzw. 42, Magen leer, ca. 2,6 s Kontrollverlust (E hämmern verkürzt, min. 1 s). Beim 3. Kotzen kommt der Sanka (`VOMIT` in balance.ts). Score-Abzug 12 % pro überstandenem Kotzen.
- **B – Magen und Rollen:** Neue Magen-Leiste (dämpft Kotz bis −50 % und Alkoholaufnahme bis −20 %, Verdauung 0,8/s). Essen hat eigene Rollen (Brezn, Hendl, Steckerlfisch mit Mischmasch-Abbau, Wasser). Obstler: verzögerter Kotz und Sprudel −8. Sekt: Prost ×2 für 25 s. Jäger: Tempo-Kick 6 s.
- Meter-Bot-Simulation (nicht eingecheckt): kluger Bot ≈ 2,4 ‰ ohne Kotzen, Maß-Spam-Bot immer Sanka (≈ 1,35 ‰), wahllos mischender Bot ≈ 0,9 ‰.

## Bekannte Schwächen / Beobachtungen

1. Gute Spieler kotzen praktisch nie, das Kotz-Netz greift dann kaum.
2. Die Spielzeit (18–23 Uhr) hat mechanisch keine Wirkung, nur Konfetti zur vollen Stunde.
3. Promille-Abbau (0,0018/s) ist so klein, dass die „Leber“ keine Rolle spielt.
4. Rülpsen ist ein reiner Cooldown-Knopf, das Prost-Event ein einzelner Tastendruck.
5. Die Welt ist Kulisse: Karussell und Autoscooter sind reine Strafen ohne Gegenwert.
6. Jede Runde ist gleich (Seed = `Date.now()`), keine Meta-Ebene.
7. Das neue Kotz-Gefühl und die Magen-Leiste wurden nur logisch getestet, nicht im Browser.

## Schritt 1 – Absichern (klein, zuerst)

- [x] Im Browser spielen (`npm run dev`): Kotz-Sequenz, HUD (4 Leisten, Sanka-Karte, Buff-Anzeige), Endscreen-Layout, Touch-Variante (E-Hämmern über den Trink-Button).
  - Per Headless-Chromium geprüft (Desktop 1280×720 und Touch 844×390): Kotzen → „Noch 2× bis zum Sanka“, Hämmern verkürzt den Kontrollverlust per Taste E und per Trink-Button um je 0,22 s, beim 3. Mal Sanka und Endscreen, keine Konsolenfehler.
  - Behoben: Endscreen-Statistik überlappte mit „Neuer Rekord!“, Menü-Anleitung stieß oben an den Kasten und erwähnte die 3 Leben und den Magen noch nicht.
- [x] **Balance-Bots als festen Test** einbauen (`tests/balance.test.ts`): 3 bis 4 Strategien (nur Maß, klug, gierig, zufällig) über je ca. 30 Seeds. Erwartungen als Assertions, z. B. „kluger Bot schlägt Spam-Bot im Schnitt“ und „Spam-Bot erreicht den Sanka in über 80 % der Runden“. Laufzeit klein halten (Vitest-Timeout beachten, Seeds reduzieren oder Timeout setzen).
- [x] Falls der kluge Bot zu sicher ist: nicht nötig. Er kotzt in ca. 40 % der Runden einmal, kommt aber nie in den Sanka.

**Ergebnis der Balance-Bots** (20 Seeds, echte Steuerung über `GameState.step`):

| Strategie | Ø Score | Ø ‰ | Sanka | mind. 1× gekotzt | Ø Getränke |
|---|---|---|---|---|---|
| Maß-Spam | 1,21 | 3,19 | 100 % | 100 % | 17,5 |
| Gierig | 1,59 | 3,26 | 90 % | 95 % | 23,1 |
| Wahllos | 0,99 | 2,61 | 100 % | 100 % | 18,3 |
| Klug | 2,44 | 2,56 | 0 % | 40 % | 15,0 |

Beobachtung 1 („gute Spieler kotzen nie“) stimmt damit nur halb: Das Kotz-Netz greift auch beim klugen Bot, kostet ihn aber wenig.

## Schritt 2 – C: Dramaturgie des Abends (Zeit wird mechanisch)

- Phasen als Konfiguration in `balance.ts` (z. B. `PHASES`), im Core über `hour` abgefragt.
  - 18–20 Uhr: ruhig (weniger Prost, Familien-NPCs).
  - 20–22 Uhr: Stimmung steigt (mehr Prost-Events, Blasmusik lauter, Happy Hour mit höherem Spawn).
  - ab 22 Uhr „Last Order“: letzte Runde, z. B. Getränke +50 % Promille, aber höheres Kotz-Risiko.
- Promille-Abbau/„Leber“ spürbar machen (z. B. Abbau steigt nachts oder hängt an einem Perk).
- Neue Events (`events.ts`): `phaseChange`; HUD-Banner dafür (`HudScene.handleEvent`).
- Tests: Phasenwechsel zur richtigen Uhrzeit, Multiplikatoren wirken.

## Schritt 3 – D: Rülpsen und Prost als Skill-Mechaniken

- Rülpsen aufladen: R halten, im Sweet-Spot loslassen (zu früh = wenig Wirkung, zu spät = Fehlrülpser). Command um `burpHeld`/`burpReleased` erweitern (`PlayerCommand`, Keyboard- und Touch-Input).
- Prost im Takt der Blasmusik (Beat aus `AudioManager`/Generator-Script `scripts/generate-audio.mjs`), Combo-Zähler mit Stimmungs-Multiplikator.
- Optional: Rülps-Duell mit einem NPC als seltenes Event.

## Schritt 4 – E: Welt mit Gegenmitteln und Chancen

- Dixi-Klo (senkt Kotz stark, kostet Zeit/Warteschlange), Hau-den-Lukas/Watschenbaum als Minispiel mit Item-Preis, Riesenrad als ruhige Kotz-Erholung.
- NPC-Verhalten: Bierleichen blockieren Wege, Rempler verschütten Getränke, Security ab hoher Promille nahe am Zelt.
- Neue Buden/Objekte in `src/config/world.ts`, Logik in `GameState`, Texturen in `src/render/textures.ts`.

## Schritt 5 – F: Meta und Wiederspielwert

- Daily Seed (Seed aus Datum), Run-Modifier („Regenwetter“, „Trachtenumzug“).
- Vorab-Perks (Lederhose, Magen aus Stahl, Leber) und Achievements („kotzfrei“, „5er-Prost-Combo“, „alle Sorten“) via `src/storage/` (`localStorage`, Interface ist bereits für eine Online-Variante vorbereitet).
- Score-Nebenziele, optional Online-Highscore.

## Arbeitsregeln

- Zahlen nur in `balance.ts`, Logik nur in `src/core/`, Renderer liest nur.
- Jede neue Mechanik: Event in `events.ts`, Test in `tests/`, README-Abschnitt „Spielmechanik in Kürze“ aktualisieren.
- Vor jedem Commit: `npm run typecheck && npm test`. Branch: `claude/blissful-cannon-phh4ur`, Pull Request nur auf ausdrücklichen Wunsch.

## Empfohlene Reihenfolge

Schritt 1 → 2 → 3 → 4 → 5. Schritt 1 ist klein und verhindert, dass das Balancing unbemerkt kippt. Schritt 2 gibt dem Spiel den größten Tiefgang pro Aufwand.
