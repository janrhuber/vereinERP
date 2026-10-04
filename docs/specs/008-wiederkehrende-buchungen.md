# 008 — Wiederkehrende Buchungen

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/wiederkehrend.js` (`generateRecurring`, `addMonthsISO`), `js/app.js` (Formular, Vorlagenliste) |
| **Tests** | – |
| **Verwandt** | [006 — Kassenbuch](006-kassenbuch.md) |

## Zweck

Regelmässige Zahlungen (Miete Vereinslokal, Versicherung, Verbandsbeiträge)
einmal erfassen; die App stellt die einzelnen Buchungen selbst als *geplant*
ins Kassenbuch.

## Verhalten

Im Formular bei „Wiederholung" ein Intervall wählen → statt einer Buchung
entsteht eine **Vorlage**.

| Code | Intervall | Monate |
|---|---|---|
| `M` | monatlich | 1 |
| `Q` | vierteljährlich | 3 |
| `H` | halbjährlich | 6 |
| `J` | jährlich | 12 |

**Erzeugen** (`generateRecurring`, bei jedem Laden der Daten):

- für jede **aktive** Vorlage, solange `naechste` ≤ 31.12. des laufenden Jahres
  und ≤ Enddatum (falls gesetzt)
- neue Buchung mit Status `GEPLANT` und `VorlageID`, dann `naechste` um das
  Intervall weiterschieben
- Sicherung gegen Endlosschleifen: höchstens 1000 Buchungen pro Lauf

**Tag im Monat:** der ursprüngliche Tag wird gehalten (`tag`). Gibt es ihn im
Zielmonat nicht, nimmt die App den letzten Tag (31. → 30. → 28./29.).

Vorlagen lassen sich pausieren, bearbeiten und löschen.

**Löschen einer Vorlage** entfernt auch alle ihre noch **geplanten** Buchungen
(nach Rückfrage mit Anzahl). Bereits **bestätigte** Buchungen bleiben erhalten.

## Daten & Schnittstellen

`einstellungen.json` → `vorlagen[]`:
`{ id, aktiv, intervall, naechste, tag, ende, typ, kategorie, steuer, beschreibung, vonAn, betrag, konto, notizen }`

## Randfälle

- Belege können nicht an eine Vorlage gehängt werden, nur an die bestätigte Buchung
- Erzeugt wird nur bis Jahresende – im Januar kommt beim ersten Öffnen das neue Jahr dazu

## Offene Punkte

- [ ] Keine Tests für die Datumsarithmetik (Monatsende, Schaltjahr)
