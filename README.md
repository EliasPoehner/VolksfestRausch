# 🍺 Maßkrug-Marathon

Ein kleines, witziges 2D-Browserspiel auf einem bayerischen Volksfest (Top-Down).
Sammle bis zum **Zapfenstreich um 23:00 Uhr** so viel Promille wie möglich – ohne zu kotzen.
Eine Runde dauert ca. 3 Minuten (In-Game 18:00 → 23:00).

Gebaut mit **Vite + TypeScript + Phaser 3 + Howler.js**. Das Ergebnis ist eine statische Website.

---

## Steuerung

| Aktion | Tastatur | Touch |
|---|---|---|
| Laufen | WASD / Pfeiltasten | virtueller Joystick (links) |
| Getränk/Essen nehmen, „Prost!“ mittrinken | E / Leertaste | 🍺-Button |
| Rülpsen: halten zum Aufladen, im grünen Bereich loslassen (Cooldown 5 s) | R halten | 💨-Button halten |
| Pause | Esc / P | ⏸ |
| Ton an/aus | M | 🔊 |

## Spielmechanik in Kürze

- **Promille** = Score. Steigt mit Alkohol. Die **Leber** baut ab, und zwar umso schneller, je höher der Pegel ist. Wer früh vollgas gibt, verliert mehr.
- **Der Abend hat drei Phasen**: *Gemütlich* (18–20 Uhr, wenig „Prost!“, leise Musik), *Stimmung* (20–22 Uhr, viel öfter „Prost!“, mehr Nachschub auf der Wiese, die Leber macht Überstunden), *Last Order* (ab 22 Uhr: Getränke bringen +50 % Promille, aber auch 25 % mehr Kotz). Ein Endspurt lohnt sich, die Phase steht im HUD über der Uhr.
- **Kotzleiste** (0–100): bei 100 wird gekotzt. Steigt passiv mit dem Rausch, durch Getränke, Karussell und Autoscooter.
- **Sprudel-Druck** (0–100): Kohlensäure. Über 80 steigt die Kotzleiste pro Sekunde, bei 100 kotzt man sofort. Rülpsen hilft.
- **Mischmasch-Meter** (0–100): verschiedene Sorten innerhalb von 30 s. Ab 50 steigt die Kotzleiste doppelt so schnell, bei 100 kotzt man sofort.
- **Magen** (0–100): Essen füllt den Magen. Ein voller Magen dämpft Kotz (bis −50 %) und Alkoholaufnahme (bis −20 %), wird aber verdaut. Essen *vorher* lohnt sich mehr als Essen *hinterher*.
- **Kotzen ist ein Rückschlag, kein Ende**: Beim Kotzen verliert man ~35 % der Promille, die Kotzleiste fällt auf 30 (beim 2. Mal 42), der Magen ist leer (20 s lang wirkt Kotz stärker), und man ist ~2,6 s handlungsunfähig. Wer **E hämmert**, verkürzt das (min. 1 s). Beim **3. Mal** kommt der Sanka. Jedes überstandene Kotzen kostet 12 % Score, der Sanka halbiert ihn.
- **Rülpsen ist Gefühlssache**: R halten lädt den Rülpser auf (Balken über dem Kopf). Im grünen Bereich (0,6–0,9 s) losgelassen gibt es einen **perfekten Rülpser** (+30 % Sprudel-Abbau, etwas weniger Kotz, nie daneben). Zu früh = schwach, 10 % Fehlrülpser. Zu lang = immer Fehlrülpser. Beim Aufladen läuft man langsamer.
- **„Prost!“ im Takt**: Während des Prost-Rufs pulsiert der Ring im Takt der Blasmusik (132 BPM) und wird grün, wenn man im Takt ist. Im Takt mitgetrunken gibt es ×1,5 Promille, jedes weitere Prost im Takt in Folge +25 % (**Combo**, bis ×2). Sofort drücken, daneben drücken oder verpassen setzt die Combo zurück.
- **Die Welt hilft und stört**:
  - **Dixi-Klo** (rechts neben dem Autoscooter): Kotz −15, Sprudel −40, Mischmasch −10. Kostet aber Zeit, denn die Schlange wird später am Abend und mit jedem eigenen Besuch länger, danach wird die Kabine geputzt.
  - **Riesenrad** (unten links): 10 s Fahrt, Kotz sinkt um 3,5 pro Sekunde. In der Zeit trinkt man nichts.
  - **Hau den Lukas** (zwischen Zelt und Autoscooter): E drücken, wenn die Nadel oben ist. Betrunken läuft sie schneller. Ab 70 % gibt es eine Freimaß, bei der Glocke (92 %) ein **Lebkuchenherz**, das einmal vor dem Sanka rettet.
  - **NPCs**: Familien gehen um 20 Uhr heim. Ab 20 Uhr torkeln **Rempler** herum, die einem Bier verschütten (−0,05 ‰). **Bierleichen** liegen im Weg. Die **Security** schiebt einen ab 2,2 ‰ aus dem Biergarten.
- **Meta und Wiederspielwert**:
  - **Tageswiesn** (📅-Button oder T): Seed und Wetter hängen am Datum, alle spielen am selben Tag dieselbe Runde. Der Tagesbestwert wird gespeichert.
  - **Wetter** (zufällig im freien Spiel): ☀️ Kaiserwetter, 🌧️ Regen (langsamer und rutschig, mehr Prost), 🎺 Trachtenumzug (mehr Leute und Bedienungen), 🔥 Hitzewelle (Sprudel baut langsamer ab, mehr Wasser).
  - **Perks** (Menü, ←/→): 🩳 Krachlederne (Rempler und Security halb so wirksam), 🛡️ Magen aus Stahl (−15 % Kotz aus Getränken, −5 % Promille), 🐂 Leber wia a Ochs (−40 % Abbau, +10 % Übelkeit). Die letzten beiden werden über Erfolge freigeschaltet.
  - **Wiesn-Aufgaben**: drei Nebenziele pro Runde (z. B. „3× Prost im Takt“, „Kotzfrei bis 23:00“), jede erfüllte gibt +5 % Score.
  - **10 Erfolge** (Menü, A), gespeichert im Browser (`src/storage/progress.ts`, asynchrone Schnittstelle für eine spätere Online-Variante).
- **Getränke haben Rollen**: Maß = solide Basis, Radler = mild, Weißbier/Sekt = viel Sprudel, **Obstler** = Sprudel runter, aber der Kotz kommt verzögert, **Sekt** = „Prost!“ zählt 25 s lang doppelt, **Jägermeister** = Mischmasch-Spike, dafür 6 s Tempo-Kick.
- **Essen hat Rollen**: Brezn = billige Unterlage, **Hendl** = größte Magenfüllung (macht kurz träge), **Steckerlfisch** = Unterlage + baut Mischmasch ab, **Wasser** = Soforthilfe gegen Kotz und Sprudel, kostet etwas Promille.
- **Gags**: Karussell dreht dich (und deinen Magen), ab 1,5 ‰ driftet die Steuerung, ab 2,5 ‰ ist sie gelegentlich vertauscht, Bildschirmwackeln und Doppeltsehen, „Prost!“-Events, Sprechblasen, Sanka-Abholung.

---

## Setup

Du brauchst Node.js ≥ 18.

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
```

Weitere Befehle:

```bash
npm test           # Unit-Tests der Spiellogik + Balance-Bots (Vitest)
npm run typecheck  # TypeScript prüfen
npm run gen:audio  # Sounds & Blasmusik neu synthetisieren → public/assets/audio
```

**Balance-Bots** (`tests/balance.test.ts` und `tests/balance-setups.test.ts` für Wetter und Perks, Strategien in `tests/support/bots.ts`): Sechs Bots (nur Maß, gierig, wahllos, klug, klug mit Endspurt, klug ohne Gefühl für Sweet-Spot und Takt) spielen je 20 komplette Runden über `GameState`. Die Tests prüfen z. B., dass kluges Spiel Maß-Spam deutlich schlägt, Spam fast immer im Sanka endet, sich der Endspurt lohnt und Gefühl beim Rülpsen und Prosten belohnt wird. Wer `balance.ts` ändert und hier Rot sieht, hat das Balancing gekippt. Mehr Runden für eine genauere Auswertung: `BALANCE_SEEDS=60 npm test`.

## Build

```bash
npm run build      # erzeugt dist/
npm run preview    # gebauten Stand lokal ansehen
```

`dist/` ist komplett statisch. Dank `base: './'` in `vite.config.ts` sind alle Pfade relativ. Das Spiel läuft damit auch in einem Unterordner, z. B. `https://example.com/spiele/masskrug/`.

## Deploy

**Normaler Webspace (FTP/SFTP)**
Den *Inhalt* von `dist/` in einen beliebigen Ordner hochladen. Fertig.

**Netlify**
- Per Drag & Drop: `dist/` auf <https://app.netlify.com/drop> ziehen.
- Oder mit Git: Build Command `npm run build`, Publish Directory `dist`.

**GitHub Pages**
Beispiel-Workflow `.github/workflows/pages.yml`:

```yaml
name: Deploy
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

Danach in den Repo-Einstellungen unter *Pages* als Quelle „GitHub Actions“ wählen. Weil die Pfade relativ sind, funktioniert `https://<user>.github.io/<repo>/` ohne weitere Anpassung.

---

## Projektstruktur

```
src/
  config/      Balancing (balance.ts) & Weltlayout (world.ts) – hier wird getunt
  core/        reine Spiellogik, KEINE Phaser-Abhängigkeit
    GameState.ts   Spieler, NPCs, Pickups, Buden, Gefahren, Events, Uhr
    Meters.ts      die vier Leisten
    scoring.ts     Score, Titel, Uhrzeit
    events.ts      Event-Queue (Logik → Renderer)
    entities.ts    Datenmodelle
    math.ts        Vektoren, Kollision, Zufall (deterministisch)
  input/       Tastatur + Touch-Joystick (DOM-basiert) → PlayerCommand
  storage/     Highscore (localStorage, austauschbar gegen Online-API)
  audio/       Howler-Wrapper
  render/      alles, was Phaser betrifft
    scenes/      Boot, Menu, Game, Hud, GameOver
    textures.ts  prozedurale Cartoon-Grafiken
    assetManifest.ts  Grafiken gegen echte PNGs austauschen
public/assets/ Font, Sounds (Sprites optional)
scripts/       Audio-Synthese
tests/         Vitest-Tests für core/
```

### Balancing

Alle Werte für Getränke, Essen, Raten, Schwellen, Spawns, NPCs, Events und Titel stehen in **`src/config/balance.ts`**. Die Positionen von Zelt, Buden, Bänken und Fahrgeschäften stehen in `src/config/world.ts`.

### Game-Loop

`GameScene.update()` sammelt die echte Frame-Zeit und ruft `GameState.step()` mit **festem Zeitschritt** (1/60 s, `ROUND.fixedStep`) auf. Danach wird gerendert. Die Logik läuft damit unabhängig von der Bildrate und ist deterministisch (Seed-RNG), was die Tests in `tests/` nutzen.

### Grafiken austauschen

Eine PNG nach `public/assets/sprites/` legen und den Key in `src/render/assetManifest.ts` eintragen (z. B. `drink_mass: 'assets/sprites/drink_mass.png'`). Die prozedurale Variante wird dann übersprungen. Neue Quellen bitte in `CREDITS.md` eintragen.

### Highscore online

`src/storage/highscore.ts` definiert das async-Interface `HighscoreStore`. Für eine Online-Rangliste eine Klasse mit `fetch()` implementieren und die exportierte Instanz `highscores` ersetzen. Die Szenen müssen dafür nicht geändert werden.

---

## Umstieg auf 3D (Three.js): wo ansetzen?

Die Architektur trennt Logik und Darstellung strikt:

| Bleibt unverändert | Wird ersetzt |
|---|---|
| `src/core/*` (gesamte Spiellogik) | `src/render/*` (Phaser-Szenen, Texturen) |
| `src/config/*` (Balancing, Layout) | `src/main.ts` (Bootstrapping) |
| `src/input/*` (DOM-basiert) | |
| `src/storage/*`, `src/audio/*` (Howler) | |

So gehst du vor:

1. **Koordinaten mappen:** Die Logik rechnet in Welt-Koordinaten `(x, y)` am Boden. In Three.js wird daraus `position.set(x * s, 0, y * s)` (y → z, Höhe = 0). `s` ist ein Skalierungsfaktor, z. B. 0,01 m pro Einheit.
2. **Neuen Renderer bauen**, z. B. `src/render3d/ThreeRenderer.ts`:
   - Loop mit `requestAnimationFrame`: Zeit akkumulieren, `state.step(ROUND.fixedStep, inputs.poll())` mit festem Schritt aufrufen, wie in `GameScene.update()`.
   - Pro Frame `state.player`, `state.npcs`, `state.pickups`, `state.bumperCars`, `state.carouselAngle` auf Meshes übertragen (Maps `id → Object3D` wie in `GameScene.render()`).
   - Statische Objekte aus `config/world.ts` (TENT, BOOTHS, BENCHES, CAROUSEL, BUMPER_ARENA, LIGHT_STRINGS) als Modelle platzieren.
   - `state.events.drain()` auswerten: Sounds (`audio.play`), Partikel und Sprechblasen (z. B. CSS2DRenderer).
3. **Rausch-Effekte:** Kamera-Wackeln über Kamera-Offset/Rotation. Doppeltsehen und Verzerrung über `EffectComposer` (z. B. ein eigener Shader mit Versatz-Sampling statt der Phaser-Ghost-Kamera).
4. **HUD:** Am einfachsten als HTML/CSS-Overlay, das `state.meters` liest. Das Touch-Overlay ist schon DOM-basiert.
5. **`main.ts`** startet dann den Three-Renderer statt `new Phaser.Game(...)`.

`npm test` stellt sicher, dass die Logik dabei unverändert bleibt.

---

## Debugging

Im Dev-Server (`npm run dev`) ist die laufende Szene als `window.__masskrug` erreichbar, z. B.:

```js
__masskrug.state.meters.promille = 2.6   // Rausch-Effekte testen
__masskrug.state.elapsed = 175           // kurz vor Zapfenstreich
```

Im Production-Build ist dieser Zugriff nicht vorhanden.

---

*Ein Spiel. Im echten Leben gilt: Trink mit Verstand, iss was Gscheids und komm sicher heim.* 🥨

Credits & Lizenzen: siehe [CREDITS.md](CREDITS.md).
