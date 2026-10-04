# 012 — Versionsanzeige

| | |
|---|---|
| **Status** | Aktiv (v1.1.0) |
| **Code** | `server/version.js`, `server/app.js` (`/api/version`), `js/app.js` (`zeigeVersion`), `vereinERP.html` |
| **Tests** | `server/test/version.test.js` |
| **Verwandt** | [002 — Zugangsmodell](002-zugangsmodell.md), [ADR-007](adr.md#adr-007--develop-und-main) |

## Zweck

In der App sehen, welcher Stand läuft – Release-Nummer aus dem Git-Tag und
der Commit-Hash. Ein Stand zwischen zwei Releases ist sofort als solcher
erkennbar.

## Voraussetzungen

Server-Modus, nur intern. Die öffentliche Einreichen-Seite zeigt **keine**
Version: Mitgliedern nützt sie nichts, Angreifern hilft sie beim gezielten
Suchen nach bekannten Lücken. Im Ordner-Modus gibt es keine Anzeige.

## Verhalten

Beim Start des Servers einmal `git describe --tags --long --match 'v[0-9]*'`
im Repo-Verzeichnis, Ergebnis wird gemerkt (ein Deployment startet den
Prozess ohnehin neu).

| `git describe` | Bedeutung | Anzeige |
|---|---|---|
| `v1.1.0-0-g1a2b3c4` | genau auf dem Release-Tag | `v1.1.0 (1a2b3c4)` |
| `v1.1.0-3-g9f8e7d6` | 3 Commits nach v1.1.0 | `v1.1.1-alpha.3 (9f8e7d6)` |
| kein Tag erreichbar | z. B. frisches Repo | `v0.0.0-alpha.<Anzahl Commits> (<hash>)` |
| kein Git (Archiv ohne `.git`) | – | `unbekannt` |

**Warum `1.1.1-alpha.3` und nicht `1.1.0-alpha.3`:** nach SemVer ist eine
Vorabversion *kleiner* als die Version ohne Zusatz. `1.1.0-alpha.3` läge vor
`1.1.0` – die Anzeige liefe rückwärts. Die Alpha zählt deshalb auf die
nächste Patch-Version hin. Ob das nächste Release dann Patch, Minor oder Major
wird, entscheidet `/release`; die Anzeige ist nur ein Wegweiser.

Kein `-dirty`-Zusatz: `npm install` beim Deployment kann `package-lock.json`
umschreiben und würde den Stand fälschlich als verändert markieren.

**Anzeige:** im Kopf der App neben dem Titel, klein und grau.

## Daten & Schnittstellen

| Methode | Pfad | extern | intern | Rolle |
|---|---|---|---|---|
| GET | `/api/version` | 404 | ✓ | – (ohne Anmeldung, auch auf dem Login-Bildschirm sichtbar) |

Antwort: `{ "version": "1.1.1-alpha.3", "hash": "9f8e7d6", "release": false, "anzeige": "v1.1.1-alpha.3 (9f8e7d6)" }`

## Randfälle

- Tag folgt nicht dem Muster `vX.Y.Z` → wird ignoriert (`--match`)
- Git nicht installiert oder kein Repo → `unbekannt`, die App läuft normal weiter
- Mehrere Tags auf demselben Commit → Git nimmt den jüngsten

## Offene Punkte

- [ ] Version auch in den Druckansichten (Jahresrechnung, Steuer)? Wäre für die Revision nachvollziehbar
