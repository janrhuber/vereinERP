# Specs — vereinERP

Index aller Feature-Specs. Eine Spec pro Feature; querschnittliche Themen
liegen in [adr.md](adr.md) (Entscheidungen) und [glossar.md](glossar.md)
(Begriffe). Die Versionshistorie steht in [changelog.md](changelog.md).

Neue Spec: [_template.md](_template.md) kopieren, nächste freie Nummer,
Zeile hier ergänzen.

## Feature-Specs

| # | Spec | Inhalt | Code | Status |
|---|---|---|---|---|
| 001 | [Speichermodi](001-speichermodi.md) | Ordner- und Server-Modus, Moduswahl, Datenformat, Konfliktschutz | `speicher*.js`, `server/daten.js` | Aktiv |
| 002 | [Zugangsmodell](002-zugangsmodell.md) | extern/intern, X-Zugang, Whitelist, Schichten | `server/hilfen.js`, `server/app.js` | Aktiv |
| 003 | [Rechnungseingang](003-eingang.md) | Einreichen, Liste, Übernehmen als Buchung, Erledigen | `server/eingang.js`, `js/eingang.js` | Aktiv |
| 004 | [Einreichen-Seite](004-einreichen-seite.md) | öffentliche Seite für Mitglieder | `einreichen.html`, `js/einreichen.js` | Aktiv |
| 005 | [Anmeldung & Benutzer](005-anmeldung-benutzer.md) | Login, Sessions, Rollen, Benutzer-CLI | `server/auth.js`, `js/anmeldung.js` | Aktiv |
| 006 | [Kassenbuch](006-kassenbuch.md) | Buchungen erfassen, Status, Kategorien, Steuercodes, Filter | `js/app.js`, `js/basis.js` | Aktiv |
| 007 | [Belegablage](007-belegablage.md) | Belege ablegen, Namensschema, Anzeige | `js/wiederkehrend.js`, `server/belege.js` | Aktiv |
| 008 | [Wiederkehrende Buchungen](008-wiederkehrende-buchungen.md) | Vorlagen, Intervalle, automatisch geplante Buchungen | `js/wiederkehrend.js` | Aktiv |
| 009 | [Kontostand & Verlauf](009-kontostand-verlauf.md) | Stand am Stichtag, Prognose, Chart | `js/app.js`, `js/verlauf.js` | Aktiv |
| 010 | [Jahresrechnung](010-jahresrechnung.md) | Erfolgsrechnung, Vermögensnachweis für die GV | `js/app.js` | Aktiv |
| 011 | [Steuerberechnung](011-steuerberechnung.md) | Reingewinn nach Art. 66 DBG / § 74 StG AG, Freigrenze | `js/app.js` | Aktiv |

## Querschnitt

| Dokument | Inhalt |
|---|---|
| [adr.md](adr.md) | Architekturentscheidungen mit Begründung |
| [glossar.md](glossar.md) | Fachbegriffe und Codes |
| [changelog.md](changelog.md) | Versionen |
