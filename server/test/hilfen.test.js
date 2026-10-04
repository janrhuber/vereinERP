"use strict";
/* Reine Hilfsfunktionen – ohne Server. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const os = require("os");

process.env.DATEN_DIR = path.join(os.tmpdir(), "vereinerp-hilfen-test");
const h = require("../hilfen");

test("sichererPfad: bleibt unter der Wurzel", () => {
  const root = path.resolve("/daten");
  assert.equal(h.sichererPfad(root, "Belege", "2026"), path.join(root, "Belege", "2026"));
});

test("sichererPfad: Path-Traversal wird abgewiesen", () => {
  const root = path.resolve("/daten");
  assert.throws(() => h.sichererPfad(root, "..", "etc", "passwd"), /Ungültiger Pfad/);
  assert.throws(() => h.sichererPfad(root, "Belege/../../x"), /Ungültiger Pfad/);
  // Nachbarordner mit gleichem Präfix ist ebenfalls draussen
  assert.throws(() => h.sichererPfad(root, "../daten-andere"), /Ungültiger Pfad/);
});

test("pruefeEndung: Whitelist, Grossschreibung egal", () => {
  assert.equal(h.pruefeEndung("Foto.JPG"), ".jpg");
  assert.equal(h.pruefeEndung("scan.heic"), ".heic");
  assert.equal(h.pruefeEndung("rechnung.pdf.exe"), null);
  assert.equal(h.pruefeEndung("bild.svg"), null, "SVG kann Script enthalten");
  assert.equal(h.pruefeEndung("ohneendung"), null);
});

test("belegBasisname: JJMMTT_Beschreibung_VonAn_Typ", () => {
  assert.equal(
    h.belegBasisname("2026-07-12", "Getränke Sommerfest", "Muster AG", "Rechnung_123.pdf"),
    "260712_Getränke_Sommerfest_Muster_AG_Rechnung");
  assert.equal(h.belegBasisname("2026-07-12", "Miete", "", "scan.pdf"), "260712_Miete");
});

test("sanitizeFilename: verbotene Zeichen raus, nie leer", () => {
  assert.equal(h.sanitizeFilename('a/b\\c:d*e?f"g<h>i|j'), "abcdefghij");
  assert.equal(h.sanitizeFilename(""), "Beleg");
  /* Leerzeichen werden zu "_", bevor der Fallback greift. In der Praxis
     unerreichbar: Name und Beschreibung werden vorher getrimmt und leer
     abgelehnt. Bewusst nicht "korrigiert" – die Funktion ist identisch
     zur Browser-Version in js/basis.js. */
  assert.equal(h.sanitizeFilename("  "), "_");
});

test("istExtern: nur der exakte Header-Wert zählt", () => {
  const req = wert => ({ get: n => (n === "X-Zugang" ? wert : undefined) });
  assert.equal(h.istExtern(req("extern")), true);
  assert.equal(h.istExtern(req(" EXTERN ")), true);
  assert.equal(h.istExtern(req("intern")), false);
  assert.equal(h.istExtern(req(undefined)), false);
});
