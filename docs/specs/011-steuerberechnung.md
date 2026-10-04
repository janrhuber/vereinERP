# 011 — Steuerberechnung

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `js/app.js` (`steuerCalc`, `renderSteuer`) |
| **Tests** | – |
| **Verwandt** | [006 — Kassenbuch](006-kassenbuch.md) (Steuercodes), [Glossar](glossar.md#steuercodes), README › Steuerliche Kurzübersicht |

## Zweck

Steuerbarer Reingewinn eines Vereins mit ideellem Zweck nach Art. 66 DBG und
§ 74 StG AG, druckbar als Beilage zur Steuererklärung. **Ersetzt keine
Steuerberatung** – Hinweis steht im README und muss dort bleiben.

## Verhalten

Gezählt werden nur **bestätigte** Buchungen des Jahres.

```
mb       = Σ Einnahmen MB
spende   = Σ Einnahmen SPENDE          (nachrichtlich, kein Ertrag)
ertrag   = Σ Einnahmen STEUERBAR
direkt   = Σ Ausgaben DIREKT
uebrig   = Σ Ausgaben UEBRIG

uebrigAbziehbar = max(0, uebrig − mb)
gewinn          = max(0, ertrag − direkt − uebrigAbziehbar)
```

Grundgedanke: der ideelle Vereinsbetrieb wird zuerst aus den steuerfreien
Mitgliederbeiträgen finanziert; nur was die Beiträge übersteigt, ist abziehbar.

**Freigrenze** (Default CHF 20 000, einstellbar):

| Reingewinn | Ergebnis |
|---|---|
| ≤ Freigrenze | keine Gewinnsteuer (Voraussetzung: Gewinn dem ideellen Zweck gewidmet) |
| > Freigrenze | **der ganze Gewinn** ist steuerbar – Freigrenze, kein Freibetrag |

Dazu Detaillisten: alle steuerbaren Erträge und alle direkt zuordenbaren Aufwendungen.

## Daten & Schnittstellen

`einstellungen.json` → `freigrenze`, `vereinName`.

## Randfälle

- Ein Steuercode, der nicht `MB`/`SPENDE` ist, zählt bei Einnahmen als steuerbar;
  bei Ausgaben zählt alles ausser `DIREKT` als übrig
- Geplante Buchungen fehlen → Hinweis
- Gewinn nie negativ (Verlust = 0)

## Offene Punkte

- [ ] Keine Tests – die Formel wäre gut testbar, liegt aber im Frontend
- [ ] Kapitalsteuer wird nicht berechnet (Vermögensnachweis liefert nur die Zahl)
