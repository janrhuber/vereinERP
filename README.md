# vereinERP – Vereinskasse & Steuern (Kanton Aargau)

Ein lokales Browser-Tool (eine einzige HTML-Datei, keine Installation, keine Cloud) für den
Kassier: Kassenbuch mit Belegablage, Jahresrechnung für die GV inkl. Vermögensnachweis
und Steuerberechnung nach den Regeln für Vereine.

## Start

1. `vereinERP.html` mit **Microsoft Edge** oder **Google Chrome** öffnen (Doppelklick genügt).
2. Oben rechts **«Datenordner wählen»** klicken und einen Ordner wählen/erstellen,
   z. B. `C:\git\vereinERP\Daten`.
3. Beim nächsten Öffnen: **«Erneut verbinden»** klicken – fertig.

## Was das Tool anlegt

```
Daten\
├── kassenbuch.csv        ← alle Buchungen, direkt mit Excel öffnenbar (Semikolon-getrennt, UTF-8)
├── einstellungen.json    ← Vereinsname, Freigrenze, Kontostände pro Jahr
└── Belege\
    ├── 2025\
    └── 2026\
```

Angehängte Rechnungen/Quittungen werden automatisch nach `Belege\<Jahr>\` **kopiert**,
sinnvoll umbenannt und in der Buchung verlinkt (Klick auf 📄 öffnet den Beleg).

## Funktionen

- **Kassenbuch:** Einnahmen und Ausgaben mit Datum, Kategorie, Von/An, Konto
  (Kasse / Bank / PostFinance), Belegen und Notizen. Filter nach Jahr, Typ und Volltext.
- **Steuerliche Einstufung pro Buchung** (Kategorie setzt den Vorschlag, übersteuerbar):
  - Einnahmen: *Mitgliederbeitrag (steuerfrei)* · *Spende/Schenkung (steuerfrei)* · *steuerbarer Ertrag*
  - Ausgaben: *direkt für steuerbare Erträge (voll abziehbar)* · *übrige Vereinsausgabe*
- **Wiederkehrende Buchungen:** Im Formular bei «Wiederholung» ein Intervall wählen
  (monatlich bis jährlich, optional mit Enddatum) – fällige Buchungen (z. B. Miete Vereinslokal,
  Versicherung, Verbandsbeiträge) werden bis Ende Jahr automatisch als **«geplant»** ins
  Kassenbuch gestellt und müssen nur noch mit ✔ bestätigt werden (dabei Beleg anhängen).
  Geplante Buchungen zählen **nicht** in Jahresrechnung und Steuerberechnung, bis sie
  bestätigt sind. Vorlagen lassen sich pausieren, bearbeiten und löschen.
- **Jahresrechnung (GV):** Einnahmen/Ausgaben nach Kategorie, Ergebnis, und
  **Vermögensnachweis** pro Konto: Anfangsbestand + Einnahmen − Ausgaben = Soll-Endbestand,
  daneben der effektive Ist-Bestand (Kontoauszug/Kassensturz) mit automatischer
  Differenzanzeige – ideal für die Revision. Druckbar / als PDF speicherbar.
- **Steuerberechnung** pro Jahr nach Art. 66 DBG / § 74 StG AG (siehe unten), druckbar
  als Beilage zur Steuererklärung, inkl. Detaillisten der steuerbaren Erträge und
  der direkt zuordenbaren Aufwendungen.

## Steuerliche Kurzübersicht für Vereine (ohne Gewähr)

- **Mitgliederbeiträge** sind **kein steuerbarer Ertrag** (Art. 66 Abs. 1 DBG).
- **Spenden, Schenkungen und Legate** sind für die Gewinnsteuer ebenfalls steuerfrei
  (Kapitalzuwachs, Art. 60 lit. c DBG).
- **Steuerbar** sind wirtschaftliche Erträge: Festwirtschaft, Sponsoring mit Gegenleistung,
  Verkäufe, Startgelder/Eintritte, Zinsen, Vermietung usw.
- **Abzüge** (Art. 66 Abs. 2 DBG): Aufwendungen, die **direkt** der Erzielung der steuerbaren
  Erträge dienen (z. B. Wareneinkauf fürs Vereinsfest), sind **voll abziehbar**.
  Die **übrigen Vereinsausgaben** sind nur abziehbar, **soweit sie die Mitgliederbeiträge
  übersteigen** – der Grundgedanke: der ideelle Vereinsbetrieb wird zuerst aus den
  steuerfreien Mitgliederbeiträgen finanziert.
- **Freigrenze:** Gewinne von juristischen Personen mit **ideellen Zwecken** bis
  **CHF 20'000** sind steuerfrei (Bund, Art. 66a DBG; der Aargau kennt dieselbe Grenze),
  sofern der Gewinn ausschliesslich und unwiderruflich diesem Zweck gewidmet ist.
  Achtung: Es ist eine **Freigrenze** – wird sie überschritten, ist der ganze Gewinn steuerbar.
  Der Wert ist im Tool einstellbar.
- **Kapitalsteuer:** Vereine zahlen auf dem Vereinsvermögen ggf. Kapitalsteuer
  (im Aargau mit Freibetrag). Der Vermögensnachweis im Tool liefert die Zahl dafür.
- **Gemeinnützigkeit:** Ist der Verein von der Steuerpflicht befreit (Verfügung des
  Kantonalen Steueramts), entfällt die Gewinn-/Kapitalsteuer ganz – die saubere
  Buchführung braucht es trotzdem.
- Steuererklärung nur einreichen, wenn eine zugestellt wird bzw. der Verein steuerpflichtig
  ist – im Zweifel beim Gemeindesteueramt nachfragen.

## Datensicherung

Alles liegt als normale Dateien im Datenordner – einfach den ganzen Ordner regelmässig
sichern. Die CSV kann jederzeit in Excel geöffnet werden; Änderungen dort bitte nur machen,
wenn vereinERP geschlossen ist. Für die Übergabe an den nächsten Kassier genügt es,
den Datenordner und die `vereinERP.html` weiterzugeben.
