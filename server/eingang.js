"use strict";
/* ================= Eingang: Rechnungen von Mitgliedern ================= */
const path = require("path");
const fsp = require("fs/promises");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const {
  DATEN_DIR, MAX_UPLOAD_BYTES,
  sanitizeFilename, fixMulterName, atomicWriteFile, sichererPfad, eindeutigerDateiname, pruefeEndung,
} = require("./hilfen");
const { requireAuth, requireKassier } = require("./auth");

const EINGANG_DATEI = path.join(DATEN_DIR, "eingang.json");
const EINGANG_DIR = path.join(DATEN_DIR, "Eingang");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

/* Schreibzugriffe auf eingang.json serialisieren (ein Prozess, aber parallele Requests) */
let schreibKette = Promise.resolve();
function mitSchreibsperre(fn) {
  const p = schreibKette.then(fn, fn);
  schreibKette = p.then(() => {}, () => {});
  return p;
}

async function ladeListe() {
  try { return JSON.parse(await fsp.readFile(EINGANG_DATEI, "utf8")); }
  catch { return []; }
}

async function speichereListe(liste) {
  await atomicWriteFile(EINGANG_DATEI, JSON.stringify(liste, null, 2));
}

const router = express.Router();

router.post("/api/eingang", requireAuth, upload.single("datei"), async (req, res, next) => {
  try {
    const betrag = parseFloat(req.body.betrag);
    const beschreibung = String(req.body.beschreibung || "").trim();
    const zahlungsinfo = String(req.body.zahlungsinfo || "").trim().slice(0, 200);
    if (!isFinite(betrag) || betrag <= 0 || betrag > 1000000) {
      return res.status(400).json({ fehler: "Ungültiger Betrag" });
    }
    if (!beschreibung) return res.status(400).json({ fehler: "Beschreibung fehlt" });
    if (!req.file) return res.status(400).json({ fehler: "Keine Datei erhalten" });
    const original = fixMulterName(req.file.originalname);
    const ext = pruefeEndung(original);
    if (!ext) return res.status(400).json({ fehler: "Dateityp nicht erlaubt (PDF, JPG, PNG, HEIC, WEBP)" });

    /* Name kommt aus der Session, nie aus dem Formular */
    const name = req.session.benutzer.name;
    await fsp.mkdir(EINGANG_DIR, { recursive: true });
    const base = sanitizeFilename(name) + "_" + sanitizeFilename(beschreibung) + "_" +
                 sanitizeFilename(path.basename(original, path.extname(original)));
    const dateiname = eindeutigerDateiname(EINGANG_DIR, base, ext);
    await fsp.writeFile(path.join(EINGANG_DIR, dateiname), req.file.buffer);

    const posten = {
      id: crypto.randomBytes(8).toString("hex"),
      eingereicht: new Date().toISOString(),
      name,
      betrag: Math.round(betrag * 100) / 100,
      zahlungsinfo,
      beschreibung: beschreibung.slice(0, 200),
      datei: "Eingang/" + dateiname,
      status: "OFFEN",
      buchungId: "",
    };
    await mitSchreibsperre(async () => {
      const liste = await ladeListe();
      liste.push(posten);
      await speichereListe(liste);
    });
    res.json(posten);
  } catch (e) { next(e); }
});

router.get("/api/eingang", requireAuth, async (req, res, next) => {
  try {
    const b = req.session.benutzer;
    let liste = await ladeListe();
    if (b.rolle !== "kassier") liste = liste.filter(p => p.name === b.name);
    res.json(liste);
  } catch (e) { next(e); }
});

router.get("/api/eingang/datei/:id", requireAuth, async (req, res, next) => {
  try {
    const b = req.session.benutzer;
    const posten = (await ladeListe()).find(p => p.id === req.params.id);
    if (!posten) return res.status(404).json({ fehler: "Nicht gefunden" });
    if (b.rolle !== "kassier" && posten.name !== b.name) {
      return res.status(403).json({ fehler: "Keine Berechtigung" });
    }
    let datei;
    try { datei = sichererPfad(EINGANG_DIR, path.basename(posten.datei)); }
    catch { return res.status(400).json({ fehler: "Ungültiger Pfad" }); }
    res.sendFile(datei, { headers: { "Content-Disposition": "inline" } }, err => {
      if (err && !res.headersSent) res.status(404).json({ fehler: "Datei nicht gefunden" });
    });
  } catch (e) { next(e); }
});

router.post("/api/eingang/:id/erledigt", requireKassier, express.json({ limit: "10kb" }), async (req, res, next) => {
  try {
    const ok = await mitSchreibsperre(async () => {
      const liste = await ladeListe();
      const posten = liste.find(p => p.id === req.params.id);
      if (!posten) return false;
      posten.status = "ERLEDIGT";
      posten.buchungId = String((req.body && req.body.buchungId) || "").slice(0, 40);
      await speichereListe(liste);
      return true;
    });
    if (!ok) return res.status(404).json({ fehler: "Nicht gefunden" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete("/api/eingang/:id", requireKassier, async (req, res, next) => {
  try {
    const geloescht = await mitSchreibsperre(async () => {
      const liste = await ladeListe();
      const posten = liste.find(p => p.id === req.params.id);
      if (!posten) return null;
      await speichereListe(liste.filter(p => p.id !== req.params.id));
      return posten;
    });
    if (!geloescht) return res.status(404).json({ fehler: "Nicht gefunden" });
    try { await fsp.unlink(sichererPfad(EINGANG_DIR, path.basename(geloescht.datei))); } catch {}
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = { router };
