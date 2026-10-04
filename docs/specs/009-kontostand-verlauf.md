# 009 — Kontostand & Verlauf

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/app.js` (`kontostandStartwerte`, `kontostandStandAm`, `kontostandPrognose`, `renderKontostand`), `js/verlauf.js` |
| **Tests** | – |
| **Verwandt** | [010 — Jahresrechnung](010-jahresrechnung.md) (Anfangsbestände) |

## Zweck

Oben im Kassenbuch jederzeit sehen, wie viel Geld auf welchem Konto ist – heute,
an einem vergangenen Tag oder als Prognose.

## Verhalten

**Startwert:** der früheste erfasste Anfangsbestand pro Konto (aus der
Jahresrechnung, `einstellungen.json` → `konten`).

**Stand am Stichtag** = Startwert + alle **bestätigten** Einnahmen − Ausgaben
mit Datum ≤ Stichtag. Bestätigte Buchungen mit künftigem Datum (z. B.
vordatierter Dauerauftrag) zählen erst ab ihrem Datum.

**Prognose** (Stichtag in der Zukunft) = Stand heute + bereits erfasste
künftige und geplante Buchungen bis zum Stichtag. Optisch abgesetzt
(gestrichelt/kursiv).

**Verlauf (Chart):** kumulierter Stand pro Konto ab 1.1. des frühesten
erfassten Jahres. Durchgezogen bis heute, gestrichelt als Prognose bis zur
letzten künftigen oder geplanten Buchung. Hover zeigt Datum und Werte aller
Konten. Farben fix pro Konto (Kasse, Bank, PostFinance).

## Daten & Schnittstellen

Liest `kassenbuch.csv` und `einstellungen.json`, schreibt nichts.

## Randfälle

- Kein Anfangsbestand erfasst → Start bei 0
- Nur geplante Buchungen → Stand heute 0, Prognose zeigt sie

## Offene Punkte

- [ ] Keine Tests
