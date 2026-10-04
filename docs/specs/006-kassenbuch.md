# 006 — Kassenbuch

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/app.js` (Formular, Liste, Filter), `js/basis.js` (Kategorien, Steuercodes, CSV) |
| **Tests** | – (Frontend, nicht automatisiert) |
| **Verwandt** | [001 — Speichermodi](001-speichermodi.md), [007 — Belegablage](007-belegablage.md), [011 — Steuer](011-steuerberechnung.md), [Glossar](glossar.md) |

## Zweck

Erfassen, bearbeiten und durchsuchen aller Einnahmen und Ausgaben des Vereins.

## Voraussetzungen

Beide Modi. Im Server-Modus nur Kassier, nur intern.

## Verhalten

**Felder einer Buchung:** Datum, Typ (Einnahme/Ausgabe), Kategorie,
steuerliche Einstufung, Beschreibung, Von/An, Betrag, Konto, Belege, Notizen,
Status, Wiederholung.

**Pflicht beim Speichern:** Datum, Beschreibung, Betrag > 0. Sonst Meldung, nichts gespeichert.

**Kategorie → Steuercode:** die Kategorie setzt den Vorschlag, die Einstufung
lässt sich pro Buchung übersteuern.

| Einnahmen | Code | Ausgaben | Code |
|---|---|---|---|
| Mitgliederbeiträge | `MB` | Aufwand Anlässe / Festwirtschaft | `DIREKT` |
| Spenden / Gönnerbeiträge / Legate | `SPENDE` | Aufwand Sponsoring / Werbung | `DIREKT` |
| Sponsoring / Werbung | `STEUERBAR` | Vereinsbetrieb | `UEBRIG` |
| Festwirtschaft / Anlässe / Verkauf | `STEUERBAR` | Leiter- / Trainerentschädigungen | `UEBRIG` |
| Kurse / Startgelder / Eintritte | `STEUERBAR` | Verwaltung | `UEBRIG` |
| Subventionen öffentliche Hand | `STEUERBAR` | Aus- und Weiterbildung | `UEBRIG` |
| Zinsen / Kapitalerträge | `STEUERBAR` | Anschaffungen / Anlagen | `UEBRIG` |
| Übrige Einnahmen | `STEUERBAR` | Verbandsbeiträge, Übrige | `UEBRIG` |

Massgeblich ist die Liste in `js/basis.js`; diese Tabelle fasst sie zusammen.

**Status:**

| Status | Bedeutung | zählt in Kontostand / Jahresrechnung / Steuer |
|---|---|---|
| `OK` (Bestätigt) | ist erfolgt | ja (Kontostand erst ab Datum, [009](009-kontostand-verlauf.md)) |
| `GEPLANT` | erwartet | nein, nur in der Prognose |

**✔ Bestätigen** setzt `GEPLANT` → `OK`. Belege hängt man über ✏️ Bearbeiten an.

**Filter:** Jahr, Typ, Status, steuerliche Einstufung, Kategorie, Konto,
Volltext (Beschreibung, Von/An, Notizen, Kategorie). Unter der Liste das Total
der gefilterten Buchungen.

**Konten:** `Kasse`, `Bank`, `PostFinance / Übrige`.

## Daten & Schnittstellen

`kassenbuch.csv` – Spalten siehe [architektur.md](../architektur.md#datenformat).
Liste nach Datum sortiert gespeichert. Endpunkte siehe [001](001-speichermodi.md).

## Randfälle

- Wiederholung gewählt **und** Beleg angehängt → abgelehnt: Belege gehören an die
  einzelne bestätigte Buchung, nicht an die Vorlage
- Kategorie aus alten Daten, die es nicht mehr gibt → bleibt erhalten und erscheint im Filter

## Offene Punkte

- [ ] Keine automatisierten Tests für die Frontend-Logik
