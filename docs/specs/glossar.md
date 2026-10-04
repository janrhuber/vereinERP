# Glossar

| Begriff | Bedeutung |
|---|---|
| **Buchung** | eine Zeile im Kassenbuch: Einnahme (`E`) oder Ausgabe (`A`) |
| **Bestätigt** (`OK`) | Buchung ist tatsächlich erfolgt; zählt in Kontostand, Jahresrechnung und Steuer |
| **Geplant** (`GEPLANT`) | erwartete Buchung, noch nicht erfolgt; zählt nur in der Prognose |
| **Vorlage** | Muster für wiederkehrende Buchungen; erzeugt geplante Buchungen |
| **Beleg** | Rechnung oder Quittung als Datei, abgelegt unter `Belege/<Jahr>/` |
| **Eingang** | Zwischenablage für Rechnungen, die Mitglieder einreichen |
| **Einreicher** | Person, die eine Rechnung einreicht – nicht dasselbe wie das Login-Konto |
| **Konto** | Geldort: `Kasse`, `Bank`, `PostFinance / Übrige` |
| **Anfangsbestand / Endbestand** | Kontostand am 1.1. bzw. effektiv am 31.12. eines Jahres (Kontoauszug, Kassensturz) |
| **Vermögensnachweis** | Anfang + Einnahmen − Ausgaben = Soll, verglichen mit dem Ist-Endbestand |
| **Freigrenze** | Reingewinn bis zu diesem Betrag bleibt steuerfrei; darüber ist der **ganze** Gewinn steuerbar |
| **extern / intern** | Zugangsweg: über `kasse.schmalzpicker.ch` (Proxy setzt `X-Zugang: extern`) bzw. direkt im Heimnetz |
| **Kassier / Mitglied** | Rollen. Kassier sieht alles, Mitglied nur den Eingang |
| **Ordner-Modus / Server-Modus** | lokaler Datenordner im Browser bzw. Daten auf dem Server |
| `DATEN_DIR` | Datenverzeichnis des Servers, in Produktion `/var/lib/vereinerp/daten` |

## Steuercodes

| Code | Typ | Bedeutung |
|---|---|---|
| `MB` | Einnahme | Mitgliederbeitrag – steuerfrei |
| `SPENDE` | Einnahme | Spende, Schenkung, Legat – steuerfrei |
| `STEUERBAR` | Einnahme | wirtschaftlicher Ertrag (Festwirtschaft, Sponsoring, Zinsen …) |
| `DIREKT` | Ausgabe | direkt für steuerbare Erträge – voll abziehbar |
| `UEBRIG` | Ausgabe | übrige Vereinsausgabe – abziehbar nur, soweit sie die Mitgliederbeiträge übersteigt |
