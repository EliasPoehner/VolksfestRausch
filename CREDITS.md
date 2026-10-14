# Credits & Lizenzen

Alle Assets liegen lokal unter `public/assets/` – es wird nichts von fremden Servern nachgeladen (kein Hotlinking).

## Schrift

| Asset | Datei | Quelle | Autor | Lizenz |
|---|---|---|---|---|
| **Lilita One** (Webfont) | `public/assets/fonts/LilitaOne-Regular.ttf` | Google Fonts – <https://fonts.google.com/specimen/Lilita+One> (bezogen aus dem offiziellen Repo <https://github.com/google/fonts/tree/main/ofl/lilitaone>) | Juan Montoreano | [SIL Open Font License 1.1](public/assets/fonts/LilitaOne-OFL.txt) – freie Nutzung, auch kommerziell und auf Websites |

## Grafiken

Alle Grafiken (Figuren, Bierzelt, Buden, Bierbänke, Karussell, Autoscooter, Getränke, Essen, Sanka, Partikel, Böden) sind **prozedural erzeugt** – sie werden zur Laufzeit per Canvas-2D in `src/render/textures.ts` gezeichnet.

- Autor: für dieses Projekt erstellt
- Lizenz: **CC0 1.0** (gemeinfrei) – frei verwendbar

Austausch gegen echte Sprites: siehe `src/render/assetManifest.ts`.

## Musik & Soundeffekte

Alle Sounds werden durch das Skript `scripts/generate-audio.mjs` per additiver Synthese erzeugt (`npm run gen:audio`) und liegen als WAV in `public/assets/audio/`:

| Datei | Inhalt |
|---|---|
| `music_blasmusik.wav` | Blasmusik-Loop (Polka in F-Dur, eigene Komposition: Tuba, Blech, Klarinette, Becken) |
| `sfx_gulp.wav` | Schluck-Geräusch |
| `sfx_crunch.wav` | Essen (Knuspern) |
| `sfx_burp.wav` / `sfx_burp_fail.wav` | Rülpser / Fehlrülpser mit „traurige Posaune“ |
| `sfx_warning.wav` | Warnton kurz vorm Kotzen |
| `sfx_vomit.wav` | Cartoon-Kotzgeräusch |
| `sfx_clink.wav` | Krüge anstoßen |
| `sfx_prost.wav` | Prost-Fanfare |
| `sfx_siren.wav` | Sanka „Tatü-tata“ |
| `sfx_bump.wav` | Autoscooter-Rempler |
| `sfx_confetti.wav` | Konfetti-Plopp |
| `sfx_click.wav` | UI-Klick |
| `sfx_win.wav` | Sieger-Fanfare |
| `sfx_whoosh.wav` | Karussell-Wusch |

- Autor: für dieses Projekt erstellt
- Lizenz: **CC0 1.0** (gemeinfrei)

## Bibliotheken (über npm, im Build gebündelt)

| Bibliothek | Lizenz |
|---|---|
| [Phaser 3](https://phaser.io) | MIT |
| [Howler.js](https://howlerjs.com) | MIT |
| [Vite](https://vitejs.dev) (nur Build) | MIT |

## Hinweis zu externen Asset-Quellen

Beim Erstellen waren Kenney.nl, OpenGameArt.org, itch.io und Freesound.org aus der Build-Umgebung nicht erreichbar. Daher die prozeduralen Platzhalter. Wenn du Assets von dort einbaust, trag sie hier mit Quelle, Autor und Lizenz ein, zum Beispiel:

| Asset | Datei | Quelle | Autor | Lizenz |
|---|---|---|---|---|
| _z. B. Tiny Town_ | `public/assets/sprites/…` | https://kenney.nl/assets/tiny-town | Kenney | CC0 1.0 |
