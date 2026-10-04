# Betrieb – vereinERP

## Adressen

| Von wo | Adresse | Was geht |
|---|---|---|
| unterwegs | https://kasse.schmalzpicker.ch | nur Rechnung einreichen |
| Heimnetz | http://192.168.1.16:3000 | volle App |
| ohne Server | `vereinERP.html` lokal öffnen | Ordner-Modus, nur Edge/Chrome |

Auch im eigenen WLAN führt `kasse.schmalzpicker.ch` über Cloudflare hinaus und
zurück – das Kassenbuch gibt es dort nie. Zum Buchen die interne Adresse.

## Benutzer

Konten: `Jan` (kassier) und `Mitglied` (mitglied, gemeinsames Passwort für alle
Mitglieder). Wer einreicht, gibt im Formular seinen Namen an – er steht in der
Eingangsliste und im Dateinamen.

```bash
ssh root@192.168.1.16
cd /var/www/vereinerp
DATEN_DIR=/var/lib/vereinerp/daten node server/benutzer-cli.js liste
DATEN_DIR=/var/lib/vereinerp/daten node server/benutzer-cli.js passwort Mitglied
DATEN_DIR=/var/lib/vereinerp/daten node server/benutzer-cli.js add <Name> kassier|mitglied
```

Passwortänderungen wirken sofort, ohne Neustart.

## Branches und Releases

- `develop` – laufende Arbeit; Feature-Branches gehen davon ab und dorthin zurück
- `main` – genau das, was produktiv läuft. Ansible deployt immer von `main`.
- Releases werden mit `vX.Y.Z` getaggt und in [specs/changelog.md](specs/changelog.md) festgehalten.

Ablauf siehe `/release` in `.claude/commands/release.md`.

## Deployment

Aus dem Repo `server-setup` (Windows, Ansible läuft über WSL):

```powershell
cd C:\git\server-setup
.\scripts\deploy.ps1 -Service vereinerp -SkipTerraform     # App
.\scripts\deploy.ps1 -Service nginx-proxy -SkipTerraform   # Proxy-Regeln
```

**Reihenfolge:** zuerst die App, dann der Proxy, wenn sich beide ändern. Die
Proxy-Whitelist verweist auf Dateien, die die neue App erst mitbringt.

Das Playbook klont `main` neu, installiert `server/` und startet den Prozess
in PM2 neu. Die Daten unter `/var/lib/vereinerp/daten` bleiben unberührt – sie
liegen bewusst ausserhalb des Git-Checkouts.

**Nach Änderungen an CSS oder JS** das `?v=…` in den `<script>`- und
`<link>`-Verweisen (`vereinERP.html`, `einreichen.html`) hochzählen. Cloudflare
cacht diese Dateien; ohne neuen Parameter bekommen Besucher eine Mischung aus
alten und neuen Dateien.

## Datensicherung

Alles Wichtige liegt in `/var/lib/vereinerp/daten` auf CT 116.

- **Proxmox:** `vzdump`-Job für CT 116 (sichert das Datenverzeichnis mit).
- **Vor jedem Deployment** zusätzlich:
  ```bash
  ssh root@192.168.1.16 'tar czf /root/daten-$(date +%Y%m%d-%H%M).tar.gz -C /var/lib/vereinerp daten'
  ```
- Das Datenformat ist in beiden Modi gleich: ein Datenordner kann 1:1 zwischen
  lokal und Server kopiert werden. Beim Kopieren von Windows die Ordnerrechte
  prüfen – `scp -r` hat einmal `drwx---rwx` hinterlassen.

## Fehlersuche

```bash
ssh root@192.168.1.16
pm2 status
pm2 logs vereinerp --lines 50
pm2 restart vereinerp
```

| Symptom | Ursache / Abhilfe |
|---|---|
| von aussen leere Seite oder alte Optik | Cloudflare-Cache: `?v=` hochgezählt? Sonst Cache leeren (Cloudflare → Caching → Purge Everything) |
| intern ständig ausgeloggt | Session-Cookie: läuft die App mit `secure: "auto"`? |
| „Konflikt – Seite neu laden" | Kassenbuch war in zwei Fenstern offen; neu laden, letzte Änderung erneut eingeben |
| Login „zu viele Versuche" | Rate-Limit, 15 Minuten warten |
| HEIC-Foto wird heruntergeladen statt angezeigt | Desktop-Browser zeigen HEIC nicht an – Datei ist trotzdem korrekt abgelegt |

## Tests

```bash
cd server && npm install && npm test
```

Die Tests laufen gegen ein temporäres Datenverzeichnis und berühren nie echte Daten.
