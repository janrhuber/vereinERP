"use strict";
/* ================= vereinERP Server (Dual-Mode-Backend) =================
   Start:  node server/index.js
   Env:    PORT (Default 3000)
           DATEN_DIR (Default ../daten – in Produktion /var/lib/vereinerp/daten)
           NODE_ENV=production → Secure-Cookies (TLS terminiert der Nginx-Proxy) */
const path = require("path");
const fs = require("fs");
const express = require("express");
const { DATEN_DIR } = require("./hilfen");
const auth = require("./auth");
const daten = require("./daten");
const belege = require("./belege");
const eingang = require("./eingang");

const PORT = parseInt(process.env.PORT, 10) || 3000;
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

app.listen(PORT, () => {
  console.log("vereinERP-Server läuft auf Port " + PORT + ", Daten in " + DATEN_DIR);
});
