# Dokumentation – vereinERP

| Dokument | Für wen | Inhalt |
|---|---|---|
| [architektur.md](architektur.md) | Entwicklung, AI | Komponenten, Betriebsmodi, Datenfluss, Sicherheitsschichten, Datenformat |
| [betrieb.md](betrieb.md) | Betrieb | Adressen, Benutzer, Deployment und Release, Datensicherung, Fehlersuche |
| [specs/](specs/README.md) | Entwicklung, AI | eine Spec pro Feature, dazu Entscheidungen (ADR), Glossar, Changelog |

Für die Bedienung durch den Kassier gilt weiterhin der [README](../README.md) im
Projektstamm. Die steuerlichen Grundlagen stehen dort ebenfalls.

## Arbeitsweise

Änderungen laufen über die Kommandos in `.claude/commands/` – siehe
[CLAUDE.md](../CLAUDE.md). Kurzfassung:

- **Spec zuerst.** Jede Verhaltensänderung beginnt in der passenden Spec unter
  `specs/`. Was nicht in einer Spec steht, ist nicht zugesichert.
- **Tests:** `cd server && npm test`. Jede Änderung am Server braucht einen Test.
- **Branches:** Arbeit auf `develop`, `main` ist das, was produktiv läuft.
