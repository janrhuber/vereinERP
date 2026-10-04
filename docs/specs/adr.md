# Architekturentscheidungen (ADR)

Jede Entscheidung: Kontext, Entscheidung, Folgen. Neue ADRs unten anfügen,
alte nicht umschreiben – eine überholte bekommt den Status «Abgelöst durch
ADR-0NN».

---

## ADR-001 – Dateien statt Datenbank

**Status:** Aktiv

**Kontext:** Ein Verein, ein Kassier, einige hundert Buchungen pro Jahr. Die
Daten müssen eine Kassierübergabe überleben und auch ohne die App lesbar sein
(Revision, Excel).

**Entscheidung:** CSV für Buchungen, JSON für Einstellungen, Belege als Dateien
in Jahresordnern. Keine Datenbank.

**Folgen:** Excel öffnet das Kassenbuch direkt. Gleichzeitiges Schreiben ist
nur grob geschützt (ETag, [Spec 001](001-speichermodi.md)) – für einen Kassier
ausreichend. Die CSV muss byte-genau bleiben (BOM).

---

## ADR-002 – Zwei Modi mit identischem Datenformat

**Status:** Aktiv

**Kontext:** Ursprünglich ein rein lokales Werkzeug. Für Mitglieder, die
Rechnungen einreichen, braucht es einen Server – der lokale Betrieb soll aber
weiter möglich sein.

**Entscheidung:** Dieselbe Oberfläche läuft im Ordner- oder Server-Modus. Die
Speicherfunktionen zweigen je nach Modus ab; das Dateiformat ist identisch.
Der Server bildet die Namenslogik der Belege nach (`server/hilfen.js` ↔
`js/basis.js`, `js/wiederkehrend.js`).

**Folgen:** Datenordner lassen sich 1:1 zwischen lokal und Server kopieren.
Logik, die es in beiden Welten gibt, muss **an beiden Stellen** gleich
geändert werden – das steht jeweils im Kommentar.

---

## ADR-003 – Der Weg entscheidet, nicht nur die Rolle

**Status:** Aktiv

**Kontext:** Alle Mitglieder teilen sich ein Konto. Jede Ansicht, die
Einreichungen zeigt, würde jedem die Rechnungen der anderen zeigen.

**Entscheidung:** Von aussen gibt es nur das Einreichen – für alle Konten,
auch den Kassier. Abarbeiten nur im Heimnetz. nginx setzt dazu
`X-Zugang: extern`; die App wertet ihn aus (`nurIntern`).

**Folgen:** Der Kassier kann unterwegs nicht buchen. Gewollt.

---

## ADR-004 – Mehrfache Sperren, Whitelist statt Blacklist

**Status:** Aktiv

**Kontext:** Eine einzelne Sperre fällt bei einem fehlerhaften Deployment
unbemerkt weg. Und eine Blacklist macht jede neue Datei automatisch öffentlich.

**Entscheidung:** Jede Sperre existiert in nginx **und** in der App. Nach
aussen gilt eine Whitelist: freigegeben ist nur, was ausdrücklich genannt ist.

**Folgen:** Eine neue Datei für die öffentliche Seite muss an zwei Stellen
freigegeben werden (`kasse.schmalzpicker.ch.conf`, `EXTERN_DATEIEN` in
`server/app.js`). Die Tests prüfen die App-Seite.

---

## ADR-005 – Eigene Seite für das Einreichen

**Status:** Aktiv

**Kontext:** Die volle App wurde von aussen nur verdeckt; ihr HTML und ihre
Skripte kamen trotzdem beim Browser an, und beim Laden blitzte sie kurz auf.

**Entscheidung:** `einreichen.html` mit eigenem, abhängigkeitsfreiem
`js/einreichen.js`. Von aussen wird nur diese Seite ausgeliefert.

**Folgen:** Login- und Formularlogik gibt es zweimal (App und Einreichen-Seite).
Bewusst in Kauf genommen: die öffentliche Seite bleibt klein und überschaubar.

---

## ADR-006 – Tests mit node:test, keine Test-Abhängigkeiten

**Status:** Aktiv

**Kontext:** Bisher wurde von Hand mit curl geprüft.

**Entscheidung:** Eingebauter Test-Runner von Node (`node --test`), Tests gegen
die echte Express-App auf freiem Port und temporärem Datenverzeichnis. Die App
ist dafür in `app.js` (Aufbau) und `index.js` (Start) getrennt.

**Folgen:** Keine neue Abhängigkeit. `index.js` nutzt bewusst kein
`require.main === module` – unter PM2 (Fork-Modus) wäre das falsch und der
Server würde nie lauschen.

---

## ADR-007 – develop und main

**Status:** Aktiv

**Entscheidung:** Arbeit auf `develop` (Feature-Branches davon), `main` ist
der produktive Stand und wird nur über Releases aktualisiert. Ansible deployt
von `main`. Releases werden mit `vX.Y.Z` getaggt.

**Folgen:** Ein Stand auf `develop` ist nie automatisch live.
