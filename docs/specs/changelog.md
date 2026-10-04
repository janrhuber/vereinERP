# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen
nach [SemVer](https://semver.org/lang/de/). Neue Einträge zuerst unter
**Unreleased**, beim Release in eine Version umgewandelt (siehe `/release`).

## [Unreleased]

## [1.0.0] – 2026-10-04

Erste getaggte Version. Fasst den Stand seit der Einführung des Server-Modus zusammen.

### Added
- Server-Modus mit Node.js-Backend, Anmeldung und Rollen (kassier, mitglied)
- Rechnungseingang: Mitglieder reichen Rechnungen ein, der Kassier übernimmt sie als Buchung
- Öffentliche Einreichen-Seite unter `kasse.schmalzpicker.ch` – von aussen wird nur sie ausgeliefert
- Pflichtfeld „Dein Name" beim Einreichen; Name steht in der Eingangsliste und im Dateinamen
- Tests mit `node:test` (`cd server && npm test`)
- Dokumentation unter `docs/`: Architektur, Betrieb, Specs pro Feature

### Changed
- Von aussen keine Listen und keine vergangenen Einreichungen mehr – auch nicht die eigenen
- Proxy nach aussen als Whitelist statt einzelner Sperren
- CSS und JS mit Versionsparameter eingebunden (Cache-Busting hinter Cloudflare)

### Fixed
- Eingang-Tab war als Kassier nicht anklickbar
- Oberfläche blitzte beim Laden kurz auf, bevor das Login erschien

### Security
- Mitglieder sahen über das gemeinsame Konto die Rechnungen aller anderen Mitglieder
