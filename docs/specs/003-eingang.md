# 003 — Rechnungseingang

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `server/eingang.js`, `js/eingang.js`, `js/app.js` (Übernahme beim Speichern) |
| **Tests** | `server/test/eingang.test.js`, `server/test/zugang.test.js` |
| **Verwandt** | [002 — Zugangsmodell](002-zugangsmodell.md), [004 — Einreichen-Seite](004-einreichen-seite.md), [006 — Kassenbuch](006-kassenbuch.md) |

## Zweck

Mitglieder reichen Rechnungen ein, die sie für den Verein bezahlt haben. Der
Kassier prüft sie im Heimnetz, übernimmt sie als Buchung und zahlt zurück.

## Voraussetzungen

Nur Server-Modus. Einreichen: jedes angemeldete Konto, von überall.
Ansehen und Abarbeiten: nur intern ([002](002-zugangsmodell.md)).

## Verhalten

**Einreichen** (`POST /api/eingang`, multipart):

| Feld | Pflicht | Regel |
|---|---|---|
| `einreicher` | ja | Name der Person, max. 80 Zeichen. Getrennt vom Konto, weil sich alle Mitglieder eines teilen |
| `betrag` | ja | Zahl > 0, ≤ 1 000 000, auf Rappen gerundet |
| `beschreibung` | ja | max. 200 Zeichen |
| `zahlungsinfo` | nein | IBAN oder Twint, max. 200 Zeichen |
| `datei` | ja | PDF, JPG, PNG, HEIC/HEIF, WEBP; max. 10 MB |

Antwort bei Erfolg: nur `{ "ok": true }` – der gespeicherte Posten wird nicht
zurückgegeben. Fehler: `400` mit `{ "fehler": "…" }`.

Datei landet in `Eingang/` als `<Einreicher>_<Beschreibung>_<Originalname>.<ext>`
(bereinigt, bei Kollision `_2`, `_3` …).

**Abarbeiten** (intern, App-Tab „Eingang"):

1. Kassier sieht offene Posten mit Einreicher, Beschreibung, Betrag, Zahlungsinfo, Datei
2. **→ Buchung:** öffnet das Erfassungsformular vorausgefüllt (Ausgabe, Betrag,
   Beschreibung, Von/An = Einreicher, Notizen = Zahlungsinfo, Status *geplant*,
   Datei als Beleg angehängt)
3. Beim Speichern wird der Posten als `ERLEDIGT` markiert, mit Verweis auf die Buchungs-ID
4. Abbrechen verwirft die Übernahme; der Posten bleibt offen
5. **🗑** löscht Posten und Datei

## Daten & Schnittstellen

`eingang.json`: Liste von Posten
`{ id, eingereicht, name, einreicher, betrag, zahlungsinfo, beschreibung, datei, status, buchungId }`.
`name` ist das Konto aus der Session (nie aus dem Formular), `status` ist `OFFEN` oder `ERLEDIGT`.

| Methode | Pfad | extern | intern | Rolle |
|---|---|---|---|---|
| POST | `/api/eingang` | ✓ | ✓ | angemeldet |
| GET | `/api/eingang` | 404 | ✓ | angemeldet (Mitglied: nur eigenes Konto) |
| GET | `/api/eingang/datei/:id` | 404 | ✓ | angemeldet (Mitglied: nur eigenes Konto) |
| POST | `/api/eingang/:id/erledigt` | 404 | ✓ | kassier |
| DELETE | `/api/eingang/:id` | 404 | ✓ | kassier |

Schreibzugriffe auf `eingang.json` laufen hintereinander (Promise-Kette), weil
parallele Requests sonst Posten überschreiben könnten.

## Randfälle

- Name nur aus Leerzeichen → abgelehnt (wird vor der Prüfung getrimmt)
- Pfad im Namen (`../../x`) → Trennzeichen werden entfernt, Datei bleibt in `Eingang/`
- Name mit führendem Punkt → Datei beginnt mit `.` und ist unter Linux versteckt
  (harmlos, siehe Offene Punkte)

## Offene Punkte

- [ ] Führende Punkte im Dateinamen entfernen – `sanitizeFilename` müsste dafür
  in `server/hilfen.js` **und** `js/basis.js` gleich geändert werden
