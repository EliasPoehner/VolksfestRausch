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

## Schritt 2 – C: Dramaturgie des Abends (Zeit wird mechanisch) ✅

- [x] Phasen als Konfiguration in `balance.ts` (`PHASES`), im Core über `eveningAt(hour)` abgefragt, `GameState.evening` hält die aktuelle Phase und setzt `Meters.mods`.
  - [x] 18–20 Uhr *Gemütlich*: Prost-Abstand ×1,35, Musik leise.
  - [x] 20–22 Uhr *Stimmung*: Prost-Abstand ×0,6, Wiesen-Spawn ×0,7 (Happy Hour), Musik lauter, Leber ×1,25.
  - [x] ab 22 Uhr *Last Order*: Getränke und Prost +50 % Promille, +35 % Kotz (seit Schritt 4: +25 %), Musik am lautesten.
  - [ ] Familien-NPCs in der ruhigen Phase (offen, braucht neue NPC-Rolle und Grafik; passt gut zu Schritt 4).
- [x] Leber spürbar: Abbau = (0,0015 + 0,003 × ‰) pro Sekunde × Phasen-Faktor. Hoher Pegel baut schneller ab.
- [x] Event `phaseChange` mit HUD-Banner, Phasenname über der Uhr, Konfetti und Musik-Lautstärke. Das Getränk-Event trägt jetzt die tatsächlich gewonnenen Promille (`+0,48 ‰` in der Last Order).
- [x] Tests: Phasenwechsel zur richtigen Uhrzeit (je genau einmal), Multiplikatoren, Leber, Event-Promille. Neuer Balance-Bot „Klug + Endspurt“ muss den klugen Bot um mindestens 5 % schlagen.

**Warum die Leber pegelabhängig ist:** Mit konstantem Abbau hatte der kluge Bot um 20 Uhr schon 2,2 ‰ und stand danach still. Die Last Order brachte kaum etwas (+0,05 Score). Mit der pegelabhängigen Leber steigt die Kurve bis zum Schluss, und der Endspurt lohnt sich.

| Strategie (20 Seeds) | Ø Score | Ø ‰ | Sanka | mind. 1× gekotzt |
|---|---|---|---|---|
| Maß-Spam | 1,18 | 3,10 | 100 % | 100 % |
| Gierig | 1,58 | 3,23 | 85 % | 95 % |
| Wahllos | 0,96 | 2,54 | 100 % | 100 % |
| Klug | 2,03 | 2,10 | 5 % | 20 % |
| Klug + Endspurt | 2,20 | 2,27 | 5 % | 20 % |

## Schritt 3 – D: Rülpsen und Prost als Skill-Mechaniken ✅

- [x] Rülpsen aufladen: `PlayerCommand.burpHeld` (R bzw. 💨 halten). Ladezeit < 0,6 s = schwach (10 % Fehlrülpser), 0,6–0,9 s = **perfekt** (×1,3 Sprudel-Abbau, −4 Kotz, nie daneben), länger = immer Fehlrülpser, ab 1,5 s platzt er von selbst. Beim Aufladen ×0,7 Tempo. Werte in `BURP`, Logik in `GameState.updateBurp` und `Meters.burp(roll, charge)`.
- [x] Prost im Takt: 132 BPM wie die Blasmusik in `scripts/generate-audio.mjs`. Der Takt läuft in der Logik ab Beginn des Prost-Rufs (`ProstState.elapsed`), Event `prostBeat` für Klick-Sound und Puls. Im Takt (±0,1 s, frühestens ab dem 1. Schlag): ×1,5, Combo +25 % je Folge-Prost bis ×2. Stats: `perfectBurps`, `prostsOnBeat`, `maxProstCombo` (für Achievements in Schritt 5).
- [x] Darstellung: Ladebalken über dem Kopf mit grünem Sweet-Spot, „PERFEKT! BÖÖÖRP!“, Prost-Ring pulsiert im Takt und wird im Takt-Fenster grün, Combo im HUD, Touch-Button „Halten“.
- [x] Tests: Rülps-Qualitäten, Aufladen per Command, Auto-Platzer, Prost im Takt mit Combo, Combo-Reset. Neuer Balance-Bot „Klug ohne Gefühl“ (tippt nur, drückt sofort) muss mindestens 5 % hinter „Klug“ liegen.
- [ ] Optional: Rülps-Duell mit einem NPC (offen).

Hinweis: Die Musik selbst läuft nicht synchron zur Logik (sie startet mit der Szene und leiert bei hohem Pegel). Deshalb gibt die Logik den Takt vor, und während des Prost-Rufs klickt es auf jedem Schlag.

| Strategie (20 Seeds) | Ø Score | Ø ‰ | Sanka | mind. 1× gekotzt |
|---|---|---|---|---|
| Maß-Spam | 1,18 | 3,10 | 100 % | 100 % |
| Gierig | 1,03 | 2,71 | 100 % | 100 % |
| Wahllos | 0,91 | 2,40 | 100 % | 100 % |
| Klug | 2,41 | 2,62 | 10 % | 45 % |
| Klug + Endspurt | 2,74 | 2,94 | 5 % | 45 % |
| Klug ohne Gefühl | 1,78 | 1,85 | 0 % | 25 % |

## Schritt 4 – E: Welt mit Gegenmitteln und Chancen ✅

- [x] **Dixi-Klo** (3 Kabinen, `DIXIS` in world.ts): Schlange (wächst mit der Uhrzeit und jedem eigenen Besuch), dann 2,5 s drin. Kotz −15, Sprudel −40, Mischmasch −10, danach 30 s „Putzen…“.
- [x] **Riesenrad**: 10 s Fahrt, Kotz −3,5/s und Sprudel −2/s, der Spieler fährt sichtbar in der Gondel mit. 25 s bis zur nächsten freien Gondel.
- [x] **Hau-den-Lukas** als Timing-Minispiel: Die Nadel läuft als Dreieck 0 → 1 → 0 und wird je ‰ 30 % schneller. Ab 0,7 gibt es eine Freimaß als Pickup, ab 0,92 ein **Lebkuchenherz**, das einmal vor dem Sanka rettet. Jeder Schlag kostet 3 Kotz.
- [x] NPC-Verhalten:
  - Bierleichen liegen ab 20 Uhr als Hindernis im Weg, höchstens 3 gleichzeitig.
  - Rempler (25 % bzw. 45 % der Besucher je Phase): −0,05 ‰, +5 Sprudel, +2 Kotz, Schubs. Danach hat man 6 s Ruhe.
  - Security im Biergarten: ab 2,2 ‰ wird man rausgeschoben.
  - Familien mit Kind (aus Schritt 2) gehen um 20 Uhr heim.
- [x] Logik als `Player.activity` (Spieler steht still, Lukas reagiert auf E) plus `GameState.dixis`/`attractions`. Neue Events: `activity`, `lukasStrike`, `rempler`, `securityPush`, `npcDown`, `npcGone`, `heartSaved`. Texturen für Dixi, Riesenrad, Lukas, Security und Lebkuchenherz.
- [x] Tests für Dixi, Schlange, Riesenrad, Lukas-Nadel und Preise, Lebkuchenherz, Familien, Security, Rempler und Bierleichen. Die Bots nutzen jetzt Dixi und Lukas, und der kluge Bot meidet bei hohem Pegel den Biergarten.

**Balancing-Notizen:** Mit −30 Kotz und kurzer Schlange war das Dixi viel zu stark (kluger Bot 4,7 Score, nie gekotzt). Jetzt bringt es dem klugen Bot etwa +0,4 Score. Rempler wurden entschärft (vorher 7 pro Runde, jetzt 1–2). Die Last Order hat jetzt Kotz ×1,25 statt ×1,35.

| Strategie (20 Seeds) | Ø Score | Ø ‰ | Sanka | mind. 1× gekotzt |
|---|---|---|---|---|
| Maß-Spam | 1,14 | 3,01 | 100 % | 100 % |
| Gierig | 0,92 | 2,42 | 100 % | 100 % |
| Wahllos | 0,94 | 2,48 | 100 % | 100 % |
| Klug | 2,88 | 2,92 | 0 % | 10 % |
| Klug + Endspurt | 3,07 | 3,15 | 0 % | 15 % |
| Klug ohne Gefühl | 2,31 | 2,31 | 0 % | 0 % |

Offen: Der kluge Bot kotzt mit dem Dixi wieder selten (Beobachtung 1). Das Riesenrad nutzt kein Bot, weil die Zeit zu teuer ist. Es lohnt sich vor allem für Menschen, die gerade nichts in der Nähe haben.

## Schritt 5 – F: Meta und Wiederspielwert ✅

- [x] **Tageswiesn**: Seed aus dem Datum (`dailySetup`, FNV-Hash von „JJJJ-MM-TT“), Wetter ebenfalls aus dem Seed. Eigener Tagesbestwert (nur die letzten 60 Tage werden gespeichert).
- [x] **Run-Modifier** (`MODIFIERS` in balance.ts): Kaiserwetter, Regenwetter, Trachtenumzug, Hitzewelle. Sie wirken über `RunFactors` (Tempo, Spawns, Prost-Takt, Drift, Zusatz-NPCs, Sprudel-Abbau, Übelkeit, Wasser). Beim Regen gibt es Regentropfen und einen grauen Filter, bei der Hitzewelle einen warmen Filter.
- [x] **Perks** (`PERKS`): Krachlederne (frei), Magen aus Stahl (Erfolg „Kotzfrei“), Leber wia a Ochs (Erfolg „Zeltkönig“). Auswahl im Menü, die Wahl wird gespeichert.
- [x] **Erfolge** (`ACHIEVEMENTS` in `src/core/meta.ts`, 10 Stück) über `ProgressStore` (`src/storage/progress.ts`, async, `localStorage` mit Speicher-Fallback). Übersicht im Menü, neue Erfolge und freigeschaltete Perks auf dem Endscreen.
- [x] **Score-Nebenziele**: 3 Wiesn-Aufgaben pro Runde aus einem Pool von 10, fest je Seed, je +5 % Score. Sie werden live erkannt (Einblendung) bzw. am Ende geprüft.
- [x] `GameState` nimmt jetzt ein `RunSetup` (Seed, Wetter, Perk, Tageswiesn). `new GameState(seed)` funktioniert weiter (normales Wetter, kein Perk).
- [x] Tests: `tests/meta.test.ts` (Tageswiesn, Determinismus, Faktoren, Aufgaben, Erfolge, Perks, Speicher). `tests/balance-setups.test.ts` prüft: kein Wetter verschiebt den Score um mehr als 25 %, kein Perk dominiert (Abstand unter 15 %).
- [ ] Optional: Online-Highscore (`HighscoreStore`/`ProgressStore` sind dafür vorbereitet, es fehlt ein Server).

| Kluger Bot (8 Seeds) | Ø Score |
|---|---|
| ohne Wetter/Perk | 3,03 |
| Regen / Trachtenumzug / Hitzewelle | 3,10 / 3,24 / 2,80 |
| Krachlederne / Magen / Leber | 3,12 / 3,11 / 3,15 |

## Ideen für danach

- Rülps-Duell mit einem NPC (aus Schritt 3, optional)
- Online-Highscore und Tageswiesn-Rangliste
- Riesenrad attraktiver machen (Bonus, z. B. „Aussicht“: zeigt kurz alle Pickups auf der Karte)
- Beobachtung 1 bleibt teilweise: Mit Dixi-Klo kotzt der kluge Bot selten. Man könnte das Dixi-Klo an den Mischmasch koppeln oder pro Runde begrenzen.

## Arbeitsregeln

- Zahlen nur in `balance.ts`, Logik nur in `src/core/`, Renderer liest nur.
- Jede neue Mechanik: Event in `events.ts`, Test in `tests/`, README-Abschnitt „Spielmechanik in Kürze“ aktualisieren.
- Vor jedem Commit: `npm run typecheck && npm test`. Branch: `claude/admiring-einstein-mtqp81`, Pull Request nur auf ausdrücklichen Wunsch.

## Stand

Alle fünf Schritte sind umgesetzt (Branch `claude/admiring-einstein-mtqp81`).
