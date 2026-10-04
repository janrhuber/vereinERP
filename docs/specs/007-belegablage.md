# 007 — Belegablage

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/wiederkehrend.js` (`storeReceipt`, `openReceipt`), `server/belege.js`, `server/hilfen.js` (`belegBasisname`) |
| **Tests** | `server/test/hilfen.test.js` (Namensschema, Endungen, Path-Traversal) |
| **Verwandt** | [006 — Kassenbuch](006-kassenbuch.md), [ADR-002](adr.md#adr-002--zwei-modi-mit-identischem-datenformat) |

## Zweck

Angehängte Rechnungen und Quittungen werden einheitlich benannt, nach Jahren
abgelegt und in der Buchung verlinkt – auch ausserhalb der App sortierbar und
lesbar (Revision, Kassierübergabe).

## Voraussetzungen

Beide Modi. Server: nur Kassier, nur intern.

## Verhalten

Beim Speichern einer Buchung wird jeder neue Beleg nach `Belege/<Jahr>/`
**kopiert** (das Jahr kommt aus dem Buchungsdatum).

**Namensschema:** `JJMMTT_Beschreibung_VonAn[_Typ].<ext>`

| Teil | Herkunft |
|---|---|
| `JJMMTT` | Buchungsdatum |
| `Beschreibung` | bereinigt, max. 40 Zeichen |
| `VonAn` | bereinigt, max. 25 Zeichen, entfällt wenn leer |
| `_Typ` | aus dem Original-Dateinamen, falls einer von: Quittung, Rechnung, Lieferschein, Gutschrift, Offerte, Vertrag, Beleg |

Bereinigen: `\ / : * ? " < > |` entfernt, Leerzeichen → `_`. Kollision → `_2`, `_3` …

Klick auf 📄 öffnet den Beleg (Server: `inline`).

**Die Logik existiert zweimal** – `js/wiederkehrend.js` und `server/hilfen.js` –
und muss gleich bleiben, sonst heissen Belege je nach Modus anders.

## Daten & Schnittstellen

| Methode | Pfad | extern | intern | Rolle |
|---|---|---|---|---|
| POST | `/api/belege` (multipart: `datei`, `jahr`, `datum`, `beschreibung`, `vonAn`) | 404 | ✓ | kassier |
| GET | `/api/belege/:jahr/:name` | 404 | ✓ | kassier |

Antwort POST: `{ pfad: "Belege/<Jahr>/<Name>" }` – dieser Pfad steht in der CSV.
Erlaubt: PDF, JPG/JPEG, PNG, HEIC/HEIF, WEBP; max. 10 MB. Jahr 1900–2200.

## Randfälle

- iPhone schickt HEIC oft als `octet-stream` → massgeblich ist die Endung, nicht der MIME-Typ
- HEIC wird im Desktop-Browser meist heruntergeladen statt angezeigt
- Path-Traversal über Jahr oder Name → 400

## Offene Punkte

- [ ] Belege werden beim Löschen einer Buchung nicht mitgelöscht (bewusst – Aufbewahrungspflicht)
