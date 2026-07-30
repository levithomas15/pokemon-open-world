# Pokémon – Open World (Pixel)

Ein Pixel-Abenteuer im Browser: Starter wählen, drei riesige Open-World-Regionen
erkunden, wilde Pokémon fangen und trainieren. Läuft auf **Desktop, Handy und Tablet**
(Hoch- und Querformat) – ohne Installation, ohne Server, offline spielbar.

## Spielen

* **Online:** siehe GitHub Pages (Link in den Repo-Einstellungen)
* **Lokal:** `index.html` im Browser öffnen
* **Eine Datei zum Weitergeben:** `dist/pokemon-komplett.html` (alles inklusive)

## Steuerung

| Aktion | Tastatur | Touch |
|---|---|---|
| Laufen | WASD / Pfeiltasten | Steuerkreuz (8 Richtungen) |
| Rennen | Shift halten | RUN (Umschalter) |
| Bestätigen | Enter / Leertaste | A oder aufs Bild tippen |
| Zurück / Menü | Esc / Q | B bzw. MENÜ |

## Spielinhalt

* **Starter:** Bisasam, Glumanda oder Schiggy – mit beiden Entwicklungsstufen
  (z. B. Glumanda → Glutexo → Glurak)
* **3 XXL-Regionen** à 256 × 256 Felder (je ~4096 × 4096 Pixel), prozedural erzeugt:
  1. **Grünwald-Weiten** – Wiesen, Wälder, Seen
  2. **Aschental-Kanyon** – heiße Schluchten und Gestrüpp
  3. **Kristall-Hochland** – Frost, Kristalle, die seltensten Pokémon
* **Begegnungen:**
  * im hohen Gras beim Laufen
  * beim Passieren dicht bewachsener Büsche ("es raschelt ...")
  * alle 30 Sekunden mit 1:40 ein Überfall aus dem Nichts
* **Seltenheit steigt pro Region:** selten/ultra-selten ~4,6 % → ~14,5 % → ~29 %
  (z. B. Pikachu, Evoli, Nebulak, Ponita; ultra: Dratini, Lapras, Aerodactyl, Relaxo)
* **Kampfsystem:** Typen-Effektivität, Statuswerte, AP, Gift/Paralyse, Volltreffer,
  Level-Ups, neue Attacken, Entwicklungen
* **Fangen** mit Poké-, Super- und Hyperbällen (Sananabeere erhöht die Chance)
* **Heilsteine** heilen das Team und dienen als Wiedereinstiegspunkt
* Pokédex, Beutel, Karte, Minimap, automatisches Speichern (localStorage)

## Projektaufbau

```
index.html                 Spielseite (lädt die Module aus src/)
src/sprites.js             Pixel-Sprites (16×16) + Trainer-Grafik
src/data.js                Typen, Attacken, Arten, Regionen, Items
src/world.js               prozedurale Weltgenerierung, Tiles, Minimap
src/battle.js              Kampflogik, Statuswerte, Fangen, Erfahrung
src/game.js                Spielschleife, Rendering, Menüs, Layout
src/touch.js               Touch-Steuerung für Handy/Tablet
sw.js, manifest.webmanifest  Offline-Betrieb / Installation als App
tools/build.js             baut dist/pokemon-komplett.html (Einzeldatei)
tools/make-icons.js        erzeugt die App-Icons
```

Nach Änderungen an `src/` oder `index.html`:

```bash
node tools/build.js
```

## Eigene Domain einrichten (später jederzeit möglich)

1. Datei `CNAME` im Repo-Hauptordner anlegen, Inhalt = die Domain, z. B. `pokemon-openworld.de`
2. Beim Domain-Anbieter die DNS-Einträge setzen:
   * **Unterdomain** (z. B. `spiel.meinedomain.de`): ein `CNAME`-Eintrag auf `levithomas15.github.io`
   * **Hauptdomain** (z. B. `meinedomain.de`): vier `A`-Einträge auf
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. Im Repo unter *Settings → Pages → Custom domain* die Domain eintragen und
   „Enforce HTTPS" aktivieren (das Zertifikat braucht nach der DNS-Umstellung bis zu 24 h).

## Als App installieren

Seite auf dem Handy öffnen → Browser-Menü → „Zum Startbildschirm hinzufügen".
Danach startet das Spiel im Vollbild und funktioniert auch ohne Internet.

## Hinweis

Fan-Projekt ohne kommerzielle Absicht. Pokémon und alle zugehörigen Namen sind
Marken von Nintendo, Game Freak und The Pokémon Company. Dieses Projekt steht in
keiner Verbindung zu diesen Unternehmen; sämtliche Grafiken sind eigener Pixel-Code.
