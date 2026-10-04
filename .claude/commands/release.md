---
description: Release – develop nach main, taggen, deployen, verifizieren
argument-hint: <X.Y.Z>
---

Erstelle das Release $ARGUMENTS. Jeder Schritt muss gelingen, bevor der nächste beginnt. Bei einem Fehler anhalten und melden – nichts überspringen.

**Vorbedingungen prüfen**

1. Version ist gültiges SemVer und grösser als der letzte Tag (`git tag --sort=-v:refname | head -1`). Passt die Stufe (Patch/Minor/Major) zu den Einträgen unter **Unreleased**? Breaking Change (Datenformat, API) = Major. Sonst nachfragen.
2. Auf `develop`, Arbeitsbaum sauber, `develop` auf dem Stand von `origin/develop`.
3. `cd server && npm test` – alles grün.
4. `docs/specs/changelog.md` hat Einträge unter **Unreleased**. Leer → anhalten.

**Release vorbereiten (auf develop)**

5. Version in `server/package.json` setzen.
6. Changelog: **Unreleased** → `## [X.Y.Z] – <heutiges Datum>`, neues leeres **Unreleased** darüber.
7. Haben sich seit dem letzten Tag CSS- oder JS-Dateien geändert (`git diff --name-only <letzter-tag>..develop -- '*.css' 'js/'`), aber `?v=` in `vereinERP.html` / `einreichen.html` nicht? Dann auf heutiges Datum hochzählen.
8. Commit `chore(release): vX.Y.Z`.

**Zusammenführen und taggen**

9. `git checkout main && git merge --no-ff develop -m "Release vX.Y.Z"`
10. Annotierter Tag: `git tag -a vX.Y.Z -m "<Changelog-Abschnitt dieser Version>"`
11. Dem User zeigen, was gepusht wird (`git log origin/main..main --oneline`), **Bestätigung einholen**, dann `git push origin main develop vX.Y.Z`.

**Deployen** (aus `C:\git\server-setup`)

12. Daten sichern: `ssh root@192.168.1.16 'tar czf /root/daten-vor-vX.Y.Z.tar.gz -C /var/lib/vereinerp daten'`, Grösse prüfen. Zeilenzahl von `kassenbuch.csv` notieren.
13. Liegen im Repo `server-setup` noch nicht ausgerollte Änderungen an `nginx-configs/kasse.schmalzpicker.ch.conf` oder `snippets/vereinerp-proxy.conf`? Mit dem User klären.
14. **Zuerst die App**: `.\scripts\deploy.ps1 -Service vereinerp -SkipTerraform`. **Nie** mit `2>&1` aufrufen.
15. **Danach der Proxy**, falls in 13 Änderungen vorlagen: `.\scripts\deploy.ps1 -Service nginx-proxy -SkipTerraform`. Die umgekehrte Reihenfolge bricht die öffentliche Seite.

**Verifizieren** – Ergebnis jeder Prüfung zeigen

16. Container läuft den Tag: `ssh root@192.168.1.16 "cd /var/www/vereinerp && git describe --tags"`; `pm2 list` zeigt `vereinerp` online.
17. Öffentlich (`https://kasse.schmalzpicker.ch`): `/api/status` mit `extern: true`; `/` ist die Einreichen-Seite; `/vereinERP.html`, `/js/app.js`, `GET /api/eingang`, `/api/kassenbuch` → 404; `POST /api/eingang` ohne Login → 401.
18. Intern (`http://192.168.1.16:3000`): `/api/status` mit `extern: false`; `/` ist die volle App; `/api/kassenbuch` → 401.
19. Ausgelieferte CSS/JS tragen den aktuellen `?v=`.
20. Daten unversehrt: Zeilenzahl von `kassenbuch.csv` wie in Schritt 12.

Abschluss: kurzer Bericht mit Version, Commits seit dem letzten Release, Prüfergebnissen und Name des Backups. Zurück auf `develop` wechseln.
