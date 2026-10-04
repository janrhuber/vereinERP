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
7. Haben sich seit dem letzten Tag CSS- oder JS-Dateien geändert (`git diff --name-only <letzter-tag>..develop -- '*.css' 'js/'`), aber `?v=` in `vereinERP.html` / `einreichen.html` nicht? Dann auf heutiges Datum hochzählen (`YYYYMMDD`). Trägt `?v=` schon das heutige Datum, weil heute bereits ein Release lief, `-2`, `-3` … anhängen – sonst greift das Cache-Busting nicht.
8. Commit `chore(release): vX.Y.Z`. Gibt es nichts zu ändern (Version, Changelog und `?v=` schon vorbereitet), entfällt er.

**Zusammenführen und taggen**

9. `git checkout main && git merge --no-ff develop -m "Release vX.Y.Z"`
10. Annotierter Tag: `git tag -a vX.Y.Z -m "<Changelog-Abschnitt dieser Version>"`
11. **`main` zurück in `develop`**: `git checkout develop && git merge --ff-only main`. Ohne diesen Schritt liegt der Tag nur auf `main`, `develop` kennt die Version nicht, und `git describe` (Versionsanzeige, Spec 012) findet auf `develop` keinen Tag mehr. `--ff-only` muss gelingen, weil `main` gerade erst aus `develop` entstanden ist. Scheitert es, anhalten.
12. Dem User zeigen, was gepusht wird (`git log origin/main..main --oneline`), **Bestätigung einholen**, dann `git push origin main develop vX.Y.Z`.

**Deployen** (aus `C:\git\server-setup`)

13. Daten sichern: `ssh root@192.168.1.16 'tar czf /root/daten-vor-vX.Y.Z.tar.gz -C /var/lib/vereinerp daten'`, Grösse prüfen. Zeilenzahl von `kassenbuch.csv` notieren.
14. Liegen im Repo `server-setup` noch nicht ausgerollte Änderungen an `nginx-configs/kasse.schmalzpicker.ch.conf` oder `snippets/vereinerp-proxy.conf`? Mit dem User klären.
15. **Zuerst die App**: `.\scripts\deploy.ps1 -Service vereinerp -SkipTerraform`. **Nie** mit `2>&1` aufrufen.
16. **Danach der Proxy**, falls in 14 Änderungen vorlagen: `.\scripts\deploy.ps1 -Service nginx-proxy -SkipTerraform`. Die umgekehrte Reihenfolge bricht die öffentliche Seite.

**Verifizieren** – Ergebnis jeder Prüfung zeigen. Am besten mit `curl -s -o /dev/null -w '%{http_code}'` in Bash. In PowerShell aufpassen: Variablennamen unterscheiden nicht zwischen Gross- und Kleinschreibung, `$p` überschreibt `$P` (so beim Release v1.0.0 passiert). Ein `ERR` ist erst ein Befund, wenn die Prüfung selbst stimmt.

17. Container läuft den Tag: `ssh root@192.168.1.16 "cd /var/www/vereinerp && git describe --tags"`; `pm2 list` zeigt `vereinerp` online; intern `GET /api/version` meldet `vX.Y.Z` ohne `alpha`.
18. Öffentlich (`https://kasse.schmalzpicker.ch`): `/api/status` mit `extern: true`; `/` ist die Einreichen-Seite; `/vereinERP.html`, `/js/app.js`, `GET /api/eingang`, `/api/kassenbuch` → 404; `POST /api/eingang` ohne Login → 401.
19. Intern (`http://192.168.1.16:3000`): `/api/status` mit `extern: false`; `/` ist die volle App; `/api/kassenbuch` → 401.
20. Ausgelieferte CSS/JS tragen den aktuellen `?v=`.
21. Daten unversehrt: Zeilenzahl von `kassenbuch.csv` wie in Schritt 13.

Abschluss: kurzer Bericht mit Version, Commits seit dem letzten Release, Prüfergebnissen und Name des Backups. Zurück auf `develop` wechseln.
