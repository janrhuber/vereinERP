# 005 — Anmeldung & Benutzer

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `server/auth.js`, `server/benutzer-cli.js`, `js/anmeldung.js` |
| **Tests** | `server/test/zugang.test.js` |
| **Verwandt** | [002 — Zugangsmodell](002-zugangsmodell.md) |

## Zweck

Anmeldung mit Name und Passwort, zwei Rollen. Benutzer werden auf dem Server
per Kommandozeile verwaltet – es gibt keine Registrierung.

## Voraussetzungen

Nur Server-Modus.

## Verhalten

| Rolle | intern | extern |
|---|---|---|
| `kassier` | alles | nur Einreichen |
| `mitglied` | Tab Eingang (einreichen, eigenes Konto sehen) | nur Einreichen |

- Unbekannte Rolle in `benutzer.json` wird als `mitglied` behandelt.
- Login prüft immer per bcrypt, auch bei unbekanntem Namen (Dummy-Hash) – die
  Antwortzeit verrät nicht, ob ein Benutzer existiert.
- Nach dem Login wird die Session neu erzeugt (`regenerate`, keine Session-Fixation).
- `benutzer.json` wird bei jedem Login frisch gelesen → Änderungen per CLI wirken sofort.

**Sessions:** Dateien in `.sitzungen/`, Laufzeit 30 Tage, bei Aktivität
verlängert. Das Secret liegt in `.session-geheimnis` und überlebt Neustarts.
Cookie `vereinerp.sid`: `httpOnly`, `sameSite=lax`, `secure: "auto"` (HTTPS
von aussen, HTTP intern).

**Rate-Limit Login:** App 10 Versuche / 15 Minuten pro IP; nginx zusätzlich
5/min. Die IP ist die echte Client-IP (`CF-Connecting-IP`, `trust proxy` = 1).

## Daten & Schnittstellen

`benutzer.json`: `[{ name, hash, rolle }]`, Modus `0600`.

| Methode | Pfad | extern | intern |
|---|---|---|---|
| GET | `/api/status` | ✓ | ✓ |
| POST | `/api/login` | ✓ | ✓ |
| POST | `/api/logout` | ✓ | ✓ |

`/api/status` → `{ server, angemeldet, benutzer: { name, rolle } | null, extern }`

**CLI** (`DATEN_DIR` wie beim Server setzen):
`add <Name> [kassier|mitglied]` · `passwort <Name>` · `entfernen <Name>` · `liste`.
Passwort mindestens 8 Zeichen, Eingabe interaktiv.

## Randfälle

- 429 nach zu vielen Versuchen → Meldung „in 15 Minuten erneut"
- `trust proxy` muss zur Proxy-Kette passen, sonst zählt das Rate-Limit pro Cloudflare-Edge statt pro Angreifer

## Offene Punkte

- [ ] Kein zweiter Faktor
