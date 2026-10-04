# 001 — Speichermodi

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/speicher.js`, `js/speicher-server.js`, `js/app.js` (Moduswahl), `server/daten.js` |
| **Tests** | `server/test/zugang.test.js` (Kassenbuch-Endpunkt) |
| **Verwandt** | [ADR-001](adr.md#adr-001--dateien-statt-datenbank), [ADR-002](adr.md#adr-002--zwei-modi-mit-identischem-datenformat) |

## Zweck

Dieselbe App arbeitet entweder mit einem lokalen Ordner oder mit dem Server.
Das Datenformat ist in beiden Fällen identisch, ein Datenordner lässt sich
ohne Umwandlung hin und her kopieren.

## Verhalten

**Moduswahl beim Start** (`app.js`, `DOMContentLoaded`):

1. `GET /api/status`
2. Antwort mit `server: true` → Server-Modus, sonst (Fehler, `file://`, statisches Hosting) → Ordner-Modus
3. Bis die Entscheidung steht, ist die Oberfläche verdeckt (`body.startet`), damit nichts aufblitzt

**Speicherfunktionen** (`readFileText`, `writeFileText`, `storeReceipt`,
`openReceipt`) prüfen als erste Zeile `serverModus` und zweigen ab. Der Rest
der App kennt den Modus nicht.

| | Ordner-Modus | Server-Modus |
|---|---|---|
| Zugriff | File System Access API, Verzeichnis-Handle in IndexedDB | `fetch` gegen `/api/…` |
| Wiederverbinden | Klick auf „Erneut verbinden" (Browser verlangt Nutzergeste) | Session-Cookie |
| Browser | Edge, Chrome | alle |

## Daten & Schnittstellen

Datenformat und CSV-Spalten: [architektur.md › Datenformat](../architektur.md#datenformat).

| Methode | Pfad | extern | intern | Rolle |
|---|---|---|---|---|
| GET | `/api/kassenbuch` | 404 | ✓ | kassier |
| PUT | `/api/kassenbuch` | 404 | ✓ | kassier |
| GET | `/api/einstellungen` | 404 | ✓ | kassier |
| PUT | `/api/einstellungen` | 404 | ✓ | kassier |

- Die CSV wird serverseitig als **Bytefolge** gelesen und geschrieben
  (`express.raw`, nie `express.text`) – sonst ginge das BOM verloren.
- Schreiben ist atomar (`.tmp` schreiben, dann umbenennen).
- **Konfliktschutz:** GET liefert einen `ETag` (SHA-1 der Datei). PUT muss ihn
  als `If-Match` mitschicken; stimmt er nicht mehr, antwortet der Server `412`
  und die App meldet „Konflikt – Seite neu laden". Die Änderung ist dann **nicht**
  gespeichert.
- Fehlt die Datei noch (erste Nutzung), antwortet GET mit `404`; die App
  startet dann mit leerem Kassenbuch – wie im Ordner-Modus.

## Randfälle

- Zwei offene Fenster: das erste Speichern gewinnt, das zweite bekommt 412.
- Excel-Änderungen an der CSV nur bei geschlossener App, danach neu laden.
- PUT mit leerem Inhalt → 400, nichts wird überschrieben.

## Offene Punkte

- [ ] Kein Merge bei Konflikt – bewusst, ein Kassier (siehe README)
