"use strict";
/* ================= Test-Helfer =================
   Startet die App gegen ein frisches, temporäres Datenverzeichnis – nie
   gegen echte Daten. node --test führt jede Testdatei in einem eigenen
   Prozess aus, darum genügt ein Server pro Datei. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");

const PASSWORT = { Jan: "kassier-test-pw", Mitglied: "mitglied-test-pw" };

/* DATEN_DIR muss stehen, bevor app.js (und damit hilfen.js) geladen wird */
async function starteServer({ kassenbuch = "ID;Datum\n1;2026-01-01\n" } = {}) {
  const datenDir = fs.mkdtempSync(path.join(os.tmpdir(), "vereinerp-test-"));
  process.env.DATEN_DIR = datenDir;

  fs.writeFileSync(path.join(datenDir, "benutzer.json"), JSON.stringify([
    { name: "Jan", hash: bcrypt.hashSync(PASSWORT.Jan, 4), rolle: "kassier" },
    { name: "Mitglied", hash: bcrypt.hashSync(PASSWORT.Mitglied, 4), rolle: "mitglied" },
  ]));
  if (kassenbuch !== null) fs.writeFileSync(path.join(datenDir, "kassenbuch.csv"), kassenbuch);

  const app = require("../app");
  const server = await new Promise(res => { const s = app.listen(0, "127.0.0.1", () => res(s)); });
  const url = "http://127.0.0.1:" + server.address().port;

  return {
    url,
    datenDir,
    async stop() {
      await new Promise(res => server.close(res));
      fs.rmSync(datenDir, { recursive: true, force: true });
    },
    /* Angemeldeter Client. extern=true simuliert den Weg über den
       öffentlichen Proxy, der "X-Zugang: extern" setzt. */
    async anmelden(name, { extern = false } = {}) {
      const r = await fetch(url + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, passwort: PASSWORT[name] }),
      });
      if (r.status !== 200) throw new Error("Login " + name + " fehlgeschlagen: " + r.status);
      const cookie = r.headers.get("set-cookie").split(";")[0];
      return client(url, { cookie, extern });
    },
    anonym({ extern = false } = {}) {
      return client(url, { cookie: null, extern });
    },
  };
}

function client(url, { cookie, extern }) {
  const kopf = extra => {
    const h = Object.assign({}, extra);
    if (cookie) h.Cookie = cookie;
    if (extern) h["X-Zugang"] = "extern";
    return h;
  };
  return {
    get: (p, opt = {}) => fetch(url + p, { headers: kopf(opt.headers) }),
    delete: p => fetch(url + p, { method: "DELETE", headers: kopf() }),
    post: (p, body, headers) => fetch(url + p, { method: "POST", headers: kopf(headers), body }),
    put: (p, body, headers) => fetch(url + p, { method: "PUT", headers: kopf(headers), body }),
  };
}

/* Formular wie aus dem Browser: ein Beleg plus Felder */
function rechnung(felder = {}, dateiname = "quittung.pdf") {
  const fd = new FormData();
  const standard = { einreicher: "Anna Muster", betrag: "42.50", beschreibung: "Getränke Sommerfest" };
  for (const [k, v] of Object.entries(Object.assign(standard, felder))) {
    if (v !== undefined) fd.append(k, v);
  }
  fd.append("datei", new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), dateiname);
  return fd;
}

module.exports = { starteServer, rechnung };
