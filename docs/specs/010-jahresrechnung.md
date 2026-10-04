# 010 — Jahresrechnung

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/app.js` (`renderJahr`, `kontoSums`, `vermoegenInput`) |
| **Tests** | – |
| **Verwandt** | [009 — Kontostand](009-kontostand-verlauf.md), [011 — Steuer](011-steuerberechnung.md) |

## Zweck

Jahresrechnung für die Generalversammlung und die Revision: Erfolgsrechnung
und Vermögensnachweis pro Konto. Druckbar bzw. als PDF speicherbar.

## Verhalten

Gezählt werden nur **bestätigte** Buchungen des gewählten Jahres. Gibt es
geplante, weist ein Hinweis darauf hin, dass sie fehlen.

**Erfolgsrechnung:** Einnahmen und Ausgaben je Kategorie, Totale, Ergebnis.

**Vermögensnachweis pro Konto** (`Kasse`, `Bank`, `PostFinance / Übrige`):

| Spalte | Herkunft |
|---|---|
| Anfangsbestand 1.1. | Eingabe, gespeichert |
| + Einnahmen / − Ausgaben | aus dem Kassenbuch |
| = Soll-Endbestand | berechnet |
| Ist-Endbestand 31.12. | Eingabe (Kontoauszug, Kassensturz), gespeichert |
| Differenz | Ist − Soll, hervorgehoben wenn ≠ 0 |

## Daten & Schnittstellen

`einstellungen.json` → `konten[<Jahr>][<Konto>] = { anfang, end }`.
Der Anfangsbestand des frühesten Jahres ist zugleich der Startwert für
[009](009-kontostand-verlauf.md).

## Randfälle

- Ist-Bestand nicht für alle Konten erfasst → Total Ist und Total Differenz
  zeigen „–" statt einer irreführenden Zahl
- Vereinsname aus den Einstellungen steht im Titel

## Offene Punkte

- [ ] Anfangsbestand wird nicht automatisch aus dem Ist-Endbestand des Vorjahres übernommen
