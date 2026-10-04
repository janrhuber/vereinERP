# vereinERP – Vereinskasse & Steuern (Kanton Aargau)

Ein Browser-Tool für den Kassier: Kassenbuch mit Belegablage, Jahresrechnung für die GV
inkl. Vermögensnachweis und Steuerberechnung nach den Regeln für Vereine.

Läuft in **zwei Modi** – die App erkennt beim Start automatisch, welcher aktiv ist:

- **Ordner-Modus** (wie bisher): `vereinERP.html` lokal öffnen, Daten liegen in einem
  selbst gewählten Ordner. Kein Server, keine Cloud.
- **Server-Modus** (neu): dieselbe App, ausgeliefert vom mitgelieferten Node.js-Backend
  (`server/`). Daten liegen zentral auf dem Server, Login mit Benutzername/Passwort,
  funktioniert auch am Handy (Beleg-Fotos direkt mit der Kamera). Vereinsmitglieder
  können Rechnungen in einen **Eingang** hochladen, die der Kassier prüft, als geplante
  Buchung übernimmt und nach Zahlung bestätigt.

## Start (Ordner-Modus)

1. `vereinERP.html` mit **Microsoft Edge** oder **Google Chrome** öffnen (Doppelklick genügt).
2. Oben rechts **«Datenordner wählen»** klicken und einen Ordner wählen/erstellen,
   z. B. `C:\git\vereinERP\Daten`.
3. Beim nächsten Öffnen: **«Erneut verbinden»** klicken – fertig.

## Start (Server-Modus)

```bash
cd server && npm install          # einmalig
node server/index.js              # vom Repo-Root aus; App unter http://localhost:3000
```

- **Benutzer anlegen:** `node server/benutzer-cli.js add <Name> kassier` bzw. `… mitglied`
  (auch `passwort`, `entfernen`, `liste`). Rolle *kassier* sieht alles, *mitglied* nur den Eingang.
- **Umgebungsvariablen:** `PORT` (Default 3000), `DATEN_DIR` (Default `./daten`, in Produktion
  z. B. `/var/lib/vereinerp/daten` – ausserhalb des Git-Checkouts!), `NODE_ENV=production`
  aktiviert Secure-Cookies (TLS terminiert der Reverse-Proxy davor).
- **Sicherheit:** bcrypt-Passwörter, Sessions (überleben Neustarts), Rate-Limit fürs Login,
  Upload-Whitelist (PDF/JPG/PNG/HEIC/WEBP, max. 10 MB), Path-Traversal-Schutz. Der Server
  gehört hinter einen HTTPS-Reverse-Proxy und ist nicht für den Direktbetrieb im Internet gedacht.
- **Datenformat ist in beiden Modi identisch** – ein bestehender Datenordner kann 1:1 nach
  `DATEN_DIR` kopiert werden (und zurück).

## Projektstruktur

```
vereinERP.html          ← Einstiegspunkt (lokal öffnen oder vom Server ausgeliefert)
einreichen.html         ← öffentliche Seite: nur Rechnung einreichen (Server-Modus, von aussen)
styles.css              ← Layout
js/basis.js             ← Konstanten, Kategorien, CSV-Logik, Modus-Zustand
js/speicher.js          ← Dateizugriff Ordner-Modus (File System Access API)
js/speicher-server.js   ← Dateizugriff Server-Modus (fetch gegen /api/…)
js/anmeldung.js         ← Login & Rollen (nur Server-Modus)
js/wiederkehrend.js     ← wiederkehrende Buchungen, Beleg-Ablage
js/eingang.js           ← Rechnungs-Eingang (nur Server-Modus)
js/app.js               ← Formular, Auswertungen, Bedienung, Modus-Erkennung
js/einreichen.js        ← Logik der Einreichen-Seite (eigenständig)
server/                 ← Node.js/Express-Backend (index.js startet app.js; auth, daten, belege, eingang)
server/benutzer-cli.js  ← Benutzerverwaltung (add/passwort/entfernen/liste)
server/test/            ← Tests (cd server && npm test)
docs/                   ← Architektur, Betrieb, Specs pro Feature
```

Die Dateien gehören zusammen – beim Weitergeben/Verschieben immer den ganzen Ordner nehmen.

## Was das Tool anlegt

```
Daten\
├── kassenbuch.csv        ← alle Buchungen, direkt mit Excel öffnenbar (Semikolon-getrennt, UTF-8)
├── einstellungen.json    ← Vereinsname, Freigrenze, Kontostände pro Jahr
└── Belege\
    ├── 2025\
    └── 2026\
        └── 260712_Sommerfest_Getraenke_Volg_Rechnung.pdf
```

Angehängte Rechnungen/Quittungen werden automatisch nach `Belege\<Jahr>\` **kopiert**,
einheitlich umbenannt und in der Buchung verlinkt (Klick auf 📄 öffnet den Beleg).
Namensschema: `JJMMTT_Beschreibung_VonAn[_Typ]` – Datum aus der Buchung, Typ
(Rechnung/Quittung/Lieferschein/…) wird aus dem Original-Dateinamen übernommen, falls
erkennbar; bei Namenskonflikten wird `_2`, `_3` … angehängt. Identisch in Ordner- und
Server-Modus (server/hilfen.js bildet dieselbe Logik in Node.js nach).

## Funktionen

- **Kassenbuch:** Einnahmen und Ausgaben mit Datum, Kategorie, Von/An, Konto
  (Kasse / Bank / PostFinance), Belegen und Notizen. Filter nach Jahr, Typ, Status,
  **Steuerlicher Einstufung**, Kategorie, Konto und Volltext – Total (Filter) steht
  unter der Liste.
- **Kontostand:** Oben im Kassenbuch-Tab immer sichtbar – frühester erfasster
  Anfangsbestand (aus der Jahresrechnung) plus alle bestätigten Einnahmen/Ausgaben
  seither, pro Konto und als Total. **Buchungen mit künftigem Datum zählen erst am
  Fälligkeitstag** – auch wenn sie schon als «Bestätigt» erfasst sind (z. B. ein
  vordatierter Dauerauftrag). Mit dem Datumsfeld lässt sich der Kontostand an
  einem **beliebigen vergangenen Tag** nachschlagen, oder – bei einem künftigen
  Datum – eine **Prognose** einsehen (heutiger Stand + bereits erfasste künftige
  und geplante Buchungen bis dahin), optisch abgesetzt (gestrichelt/kursiv).
- **Verlauf:** Chart darunter zeigt den kumulierten Kontostand pro Konto über die
  Zeit – durchgezogen bis heute, gestrichelt als Prognose bis zur letztesten
  erfassten künftigen/geplanten Buchung. Maus über die Linie zeigt Datum und
  Werte aller Konten.
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

> **Hinweis:** Dieses Tool ersetzt keine Steuerberatung. Massgebend sind die aktuellen
> Gesetze und die Praxis des Kantonalen Steueramts Aargau bzw. der Gemeinde. Sätze und
> Regeln können ändern – im Zweifel dort nachfragen oder eine Fachperson beiziehen.
> Für die Richtigkeit der Berechnungen wird keine Haftung übernommen.

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

Alles liegt als normale Dateien im Datenordner (bzw. in `DATEN_DIR` auf dem Server) –
einfach den ganzen Ordner regelmässig sichern. Die CSV kann jederzeit in Excel geöffnet
werden; Änderungen dort bitte nur machen, wenn vereinERP geschlossen ist. Für die Übergabe
an den nächsten Kassier genügt es, den Datenordner und den Programmordner weiterzugeben.

Hinweise Server-Modus: HEIC-Fotos (iPhone) werden gespeichert und verlinkt, im
Desktop-Browser aber meist heruntergeladen statt angezeigt. Arbeiten zwei offene Fenster
gleichzeitig am Kassenbuch, gewinnt das erste – das zweite bekommt beim Speichern eine
Konfliktmeldung und muss neu laden (bewusst einfach gehalten, es gibt einen Kassier).

## Dokumentation

Architektur, Betrieb und eine Spec pro Feature: [docs/](docs/README.md).

## Lizenz

MIT – siehe [LICENSE](LICENSE). Nutzung auf eigene Verantwortung.
