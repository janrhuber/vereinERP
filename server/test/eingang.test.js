"use strict";
/* Rechnung einreichen (Spec 003): Validierung und was die Antwort verrät. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { starteServer, rechnung } = require("./helfer");

let srv, mitglied, kassier;

before(async () => {
  srv = await starteServer();
  mitglied = await srv.anmelden("Mitglied", { extern: true });
  kassier = await srv.anmelden("Jan");
});

after(() => srv.stop());

test("gültige Einreichung: Antwort verrät nur ok, nichts vom Posten", async () => {
  const r = await mitglied.post("/api/eingang", rechnung());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("Einreicher wird gespeichert – getrennt vom Konto", async () => {
  await mitglied.post("/api/eingang", rechnung({ einreicher: "Beat Beispiel" }));
  const p = (await (await kassier.get("/api/eingang")).json()).find(x => x.einreicher === "Beat Beispiel");
  assert.ok(p, "Posten mit Einreicher fehlt");
  assert.equal(p.name, "Mitglied", "Konto bleibt das Login-Konto");
  assert.match(p.datei, /^Eingang\/Beat_Beispiel_/, "Name steht im Dateinamen");
  assert.ok(fs.existsSync(path.join(srv.datenDir, p.datei)), "Datei liegt im Eingang-Ordner");
});

const ABGELEHNT = [
  ["ohne Namen", { einreicher: undefined }, /Namen/],
  ["Name nur Leerzeichen", { einreicher: "   " }, /Namen/],
  ["ohne Beschreibung", { beschreibung: undefined }, /Beschreibung/],
  ["Betrag 0", { betrag: "0" }, /Betrag/],
  ["Betrag negativ", { betrag: "-5" }, /Betrag/],
  ["Betrag keine Zahl", { betrag: "viel" }, /Betrag/],
];

for (const [fall, felder, meldung] of ABGELEHNT) {
  test(`abgelehnt: ${fall}`, async () => {
    const r = await mitglied.post("/api/eingang", rechnung(felder));
    assert.equal(r.status, 400);
    assert.match((await r.json()).fehler, meldung);
  });
}

test("abgelehnt: Dateityp ausserhalb der Whitelist", async () => {
  const r = await mitglied.post("/api/eingang", rechnung({}, "virus.exe"));
  assert.equal(r.status, 400);
  assert.match((await r.json()).fehler, /Dateityp/);
});

test("Name aus dem Formular kann keinen Pfad unterschieben", async () => {
  await mitglied.post("/api/eingang", rechnung({ einreicher: "../../etc/passwd" }));
  const p = (await (await kassier.get("/api/eingang")).json()).find(x => x.einreicher.includes("passwd"));
  /* Entscheidend ist nicht, ob ".." im Namen vorkommt – ohne Trennzeichen ist
     "....etcpasswd" ein gewöhnlicher Dateiname –, sondern dass die Datei im
     Eingang-Ordner bleibt. */
  const dateiname = p.datei.replace(/^Eingang\//, "");
  assert.ok(!/[\\/]/.test(dateiname), "Trennzeichen im Dateinamen: " + p.datei);
  const ziel = path.resolve(srv.datenDir, p.datei);
  assert.ok(ziel.startsWith(path.resolve(srv.datenDir, "Eingang") + path.sep), "ausserhalb Eingang: " + ziel);
  assert.ok(fs.existsSync(ziel));
});
