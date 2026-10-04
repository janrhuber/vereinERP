# 002 — Zugangsmodell

| | |
|---|---|
| **Status** | Aktiv (v1.0.0) |
| **Code** | `server/hilfen.js` (`istExtern`, `nurIntern`), `server/app.js` (`EXTERN_DATEIEN`), alle Router; nginx: `server-setup/nginx-configs/kasse.schmalzpicker.ch.conf`, `snippets/vereinerp-proxy.conf` |
| **Tests** | `server/test/zugang.test.js`, `server/test/einreichen-seite.test.js`, `server/test/hilfen.test.js` |
| **Verwandt** | [004 — Einreichen-Seite](004-einreichen-seite.md), [005 — Anmeldung](005-anmeldung-benutzer.md), [ADR-003](adr.md#adr-003--der-weg-entscheidet-nicht-nur-die-rolle), [ADR-004](adr.md#adr-004--mehrfache-sperren-whitelist-statt-blacklist) |

## Zweck

Von aussen kann man **nur eine Rechnung einreichen** – nichts sehen, nichts
abarbeiten, auch nicht die eigenen Einreichungen. Alles andere geht nur aus
dem Heimnetz.

## Voraussetzungen

Nur Server-Modus. Gilt für **alle** Konten, auch den Kassier.

## Verhalten

**Zugangsweg** bestimmen (`istExtern`): Header `X-Zugang` mit Wert `extern`
(Gross-/Kleinschreibung und Leerzeichen egal) → extern. Fehlt er oder hat einen
anderen Wert → intern.

| Weg | Wer setzt den Header | Ergebnis |
|---|---|---|
| `https://kasse.schmalzpicker.ch` | nginx, immer (`proxy_set_header`, überschreibt Mitgeschicktes) | extern |
| `http://192.168.1.16:3000` | niemand | intern |

**Sperren:** Endpunkte, die Einträge zeigen oder verändern, beginnen mit
`nurIntern` und antworten von aussen mit **404** – nicht 403, damit nach aussen
nicht erkennbar ist, dass es sie gibt. Erst danach greift die Rolle.

**Statische Dateien:** von aussen nur `EXTERN_DATEIEN` (`einreichen.html`,
`styles.css`, `js/einreichen.js`); `/` liefert `einreichen.html`. Alles andere 404.

### Matrix

| Pfad | extern | intern | Rolle intern |
|---|---|---|---|
| `GET /` | Einreichen-Seite | volle App | – |
| `GET /api/status` | ✓ (`extern: true`) | ✓ (`extern: false`) | – |
| `POST /api/login`, `/api/logout` | ✓ | ✓ | – |
| `POST /api/eingang` | ✓ | ✓ | angemeldet |
| `GET /api/eingang`, `/api/eingang/datei/:id` | 404 | ✓ | angemeldet |
| `POST /api/eingang/:id/erledigt`, `DELETE /api/eingang/:id` | 404 | ✓ | kassier |
| `/api/kassenbuch`, `/api/einstellungen`, `/api/belege…` | 404 | ✓ | kassier |
| jede andere Datei | 404 | ✓ | – |

### Schichten

Jede Sperre gibt es doppelt: als Whitelist in nginx und als `nurIntern` bzw.
`EXTERN_DATEIEN` in der App. Fällt eine durch einen Konfigurationsfehler weg,
hält die andere. Die Tests prüfen die App-Schicht ohne nginx.

## Randfälle

- Kassier meldet sich von aussen an → sieht nur das Formular. Gewollt.
- Im eigenen WLAN über `kasse.schmalzpicker.ch` → trotzdem extern (der Weg
  führt über Cloudflare).
- Neue Datei für die Einreichen-Seite → an **zwei** Stellen freigeben
  (nginx-Whitelist und `EXTERN_DATEIEN`), sonst 404.

## Offene Punkte

- [ ] Kein Upload-Kontingent pro Konto; begrenzt nur durch nginx (20 Uploads/min pro IP)
- [ ] Kein zweiter Faktor fürs Kassier-Konto – vertretbar, weil von aussen ohnehin nichts erreichbar ist
