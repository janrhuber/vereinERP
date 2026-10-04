# 004 — Einreichen-Seite

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `einreichen.html`, `js/einreichen.js`, `server/app.js` (`EXTERN_DATEIEN`) |
| **Tests** | `server/test/einreichen-seite.test.js` |
| **Verwandt** | [002 — Zugangsmodell](002-zugangsmodell.md), [003 — Eingang](003-eingang.md), [ADR-005](adr.md#adr-005--eigene-seite-für-das-einreichen) |

## Zweck

Die öffentliche Seite unter `kasse.schmalzpicker.ch`: anmelden, Rechnung
einreichen, sonst nichts. Die eigentliche App wird von aussen gar nicht
ausgeliefert – nicht bloss verdeckt.

## Voraussetzungen

Server-Modus. Von aussen ist es die einzige Seite; intern ist sie zusätzlich
unter `/einreichen.html` erreichbar.

## Verhalten

1. Seite startet verdeckt, fragt `/api/status` ab
2. Nicht angemeldet → Login; angemeldet → Formular
3. Formular einspaltig (fürs Handy): Name, Betrag, Wofür, IBAN/Twint, Datei
4. Nach dem Einreichen: Erfolgsmeldung; **Name und Zahlungsinfo bleiben stehen**,
   Betrag, Zweck und Datei werden geleert
5. Name wird im `localStorage` des Geräts gemerkt und beim nächsten Besuch vorbelegt
6. `401` beim Einreichen (Sitzung abgelaufen) → zurück zum Login mit Hinweis

`js/einreichen.js` ist **eigenständig** und lädt keine anderen App-Skripte. Es
spricht nur mit `/api/status`, `/api/login`, `/api/logout` und `POST /api/eingang`.

## Daten & Schnittstellen

Keine eigenen – siehe [003](003-eingang.md). Im Browser: `localStorage`
`vereinerp.einreicher`.

Ausgelieferte Dateien von aussen (an zwei Stellen gepflegt, [ADR-004](adr.md#adr-004--mehrfache-sperren-whitelist-statt-blacklist)):

| Datei | nginx-Whitelist | `EXTERN_DATEIEN` |
|---|---|---|
| `/` → `einreichen.html` | ✓ | ✓ |
| `/einreichen.html` | ✓ | ✓ |
| `/styles.css` | ✓ | ✓ |
| `/js/einreichen.js` | ✓ | ✓ |

## Randfälle

- `?v=…` an CSS/JS stört die Whitelist nicht (Pfadvergleich ohne Query)
- Geteiltes Gerät: der gemerkte Name bleibt für die nächste Person stehen – sichtbar, also korrigierbar
- Server nicht erreichbar → Meldung statt leerer Seite

## Offene Punkte

- [ ] `styles.css` ist die volle App-CSS. Unkritisch, aber eine eigene, kleine CSS wäre konsequenter
