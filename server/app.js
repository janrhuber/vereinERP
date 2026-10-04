"use strict";
/* ================= vereinERP Express-App =================
   Aufbau der App ohne listen(). Gestartet wird über index.js (PM2),
   die Tests binden die App selbst an einen freien Port.
   DATEN_DIR muss gesetzt sein, BEVOR dieses Modul geladen wird – hilfen.js
   liest ihn beim ersten require. */
const path = require("path");
const fs = require("fs");
const express = require("express");
const { DATEN_DIR, istExtern, nurIntern } = require("./hilfen");
const { version } = require("./version");
const auth = require("./auth");
const daten = require("./daten");
const belege = require("./belege");
const eingang = require("./eingang");

const REPO_ROOT = path.join(__dirname, "..");

for (const d of ["", "Belege", "Eingang", ".sitzungen"]) {
  fs.mkdirSync(path.join(DATEN_DIR, d), { recursive: true });
}

const app = express();
/* Genau EIN vertrauenswuerdiger Hop: der Nginx-Proxy.
   Voraussetzung: Nginx setzt X-Forwarded-For auf $remote_addr (die echte Client-IP,
   die das real_ip-Modul aus CF-Connecting-IP gewinnt) und haengt NICHT die Kette an.
   Sonst landet hier die Cloudflare-Edge-IP und das Login-Rate-Limit zaehlt pro Edge
   statt pro Angreifer. Siehe nginx-configs/cloudflare-realip.conf im server-setup. */
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "same-origin");
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  next();
});

app.use(auth.sessionMiddleware());
app.use(auth.router);
app.use(daten.router);
app.use(belege.router);
app.use(eingang.router);

/* Version des laufenden Stands (Spec 012). Nur intern: von aussen würde sie
   beim gezielten Suchen nach bekannten Lücken helfen. Ohne Anmeldung, damit
   sie schon auf dem Login-Bildschirm sichtbar ist. Beim Start ermittelt. */
version();
app.get("/api/version", nurIntern, (req, res) => res.json(version()));

/* Von aussen gibt es nur die Einreichen-Seite (Spec 004). Die eigentliche
   App – vereinERP.html und ihre Skripte – wird gar nicht erst ausgeliefert,
   nicht bloss verdeckt. Zweite Schicht hinter der Nginx-Whitelist.
   API-Routen sind oben schon behandelt; was hier ankommt, ist statisch. */
const EXTERN_DATEIEN = new Set(["/einreichen.html", "/styles.css", "/js/einreichen.js"]);
app.use((req, res, next) => {
  if (!istExtern(req)) return next();
  if (req.path === "/") return res.sendFile(path.join(REPO_ROOT, "einreichen.html"));
  if (EXTERN_DATEIEN.has(req.path)) return next();
  res.status(404).end();
});

/* Statische App ausliefern – Server-Code, Daten und Git-Interna nie */
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.startsWith("/server") || p.startsWith("/daten") || p.startsWith("/.") || p.includes("/.git")) {
    return res.status(404).end();
  }
  next();
});
app.use(express.static(REPO_ROOT, { index: "vereinERP.html" }));

/* zentrale Fehlerbehandlung */
app.use((err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ fehler: "Datei zu gross (max. 10 MB)" });
  }
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ fehler: "Serverfehler" });
});

module.exports = app;
