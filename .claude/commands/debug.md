---
description: Fehler diagnostizieren – nicht beheben
argument-hint: <Symptom>
---

Diagnostiziere folgendes Problem: $ARGUMENTS

**Nichts ändern** – weder Code noch Server noch Daten. Ziel ist eine belegte Ursache, nicht ein Fix.

1. **Einordnen**: Modus (Ordner/Server), Zugangsweg (extern über `kasse.schmalzpicker.ch` / intern über `192.168.1.16:3000`), Rolle, Browser/Gerät, seit wann. Fehlt etwas davon, nachfragen.
2. **Schicht für Schicht vom Nutzer nach innen**, jeweils mit Beleg:
   - **Cloudflare**: DNS-Auflösung, `cf-cache-status` der betroffenen Datei (alte CSS/JS aus dem Cache?), passender `?v=`?
   - **nginx-proxy** (CT 110): Whitelist in `server-setup/nginx-configs/kasse.schmalzpicker.ch.conf`; Logs `/var/log/nginx/kasse.schmalzpicker.ch_{access,error}.log`; direkt am Proxy testen mit `curl -sk --resolve kasse.schmalzpicker.ch:443:127.0.0.1 …`
   - **App** (CT 116): `pm2 list`, `pm2 logs vereinerp --lines 100 --nostream`; direkt testen auf `http://127.0.0.1:3000`, mit und ohne Header `X-Zugang: extern`
   - **Daten**: `/var/lib/vereinerp/daten` – Datei vorhanden, Rechte, BOM der CSV (`head -c3 | od -c`)
3. **Reproduzieren** – möglichst als `node:test`-Fall in `server/test/` (nicht committen, nur zur Diagnose) oder als curl-Sequenz.
4. **Mit der Spec abgleichen**: Was sagt die betroffene Spec in `docs/specs/`? Ist es ein Bug (Code weicht ab) oder fehlende/falsche Spec?

Ergebnis: Ursache mit Belegen (Befehl + Ausgabe), betroffene Datei und Zeile, Einschätzung Bug vs. Spec-Lücke, Vorschlag für den Fix. Umsetzung erst auf Anweisung über `/bugfix`.
