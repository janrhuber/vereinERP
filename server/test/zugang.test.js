"use strict";
/* Zugangsmodell: von aussen nur Einreichen, intern alles (Spec 002).
   Das ist die zweite Schicht hinter der Nginx-Pfadsperre – diese Tests
   stellen sicher, dass sie auch hält, wenn die Proxy-Config fehlt. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { starteServer, rechnung } = require("./helfer");

let srv, kassierIntern, kassierExtern, mitgliedExtern, postenId;

before(async () => {
  srv = await starteServer();
  kassierIntern = await srv.anmelden("Jan");
  kassierExtern = await srv.anmelden("Jan", { extern: true });
  mitgliedExtern = await srv.anmelden("Mitglied", { extern: true });

  const r = await mitgliedExtern.post("/api/eingang", rechnung());
  assert.equal(r.status, 200);
  postenId = (await (await kassierIntern.get("/api/eingang")).json())[0].id;
});

after(() => srv.stop());

/* [Pfad, Methode, erwartet intern (Kassier), erwartet extern (Kassier und Mitglied)] */
const MATRIX = [
  ["/api/eingang", "GET", 200, 404],
  ["/api/eingang/datei/:id", "GET", 200, 404],
  ["/api/kassenbuch", "GET", 200, 404],
  ["/api/belege/2026/x.pdf", "GET", 404, 404], // intern 404 = Datei fehlt, nicht gesperrt
];

for (const [pfad, methode, intern, extern] of MATRIX) {
  test(`${methode} ${pfad}: intern ${intern}, extern ${extern}`, async () => {
    const p = pfad.replace(":id", postenId);
    assert.equal((await kassierIntern.get(p)).status, intern, "Kassier intern");
    assert.equal((await kassierExtern.get(p)).status, extern, "Kassier extern");
    assert.equal((await mitgliedExtern.get(p)).status, extern, "Mitglied extern");
  });
}

test("von aussen lässt sich nichts abarbeiten – auch nicht als Kassier", async () => {
  assert.equal((await kassierExtern.post(`/api/eingang/${postenId}/erledigt`, "{}",
    { "Content-Type": "application/json" })).status, 404);
  assert.equal((await kassierExtern.delete(`/api/eingang/${postenId}`)).status, 404);
  assert.equal((await kassierExtern.put("/api/kassenbuch", "x", { "Content-Type": "text/csv" })).status, 404);
  // Posten existiert danach unverändert
  const liste = await (await kassierIntern.get("/api/eingang")).json();
  assert.equal(liste.find(p => p.id === postenId).status, "OFFEN");
});

test("/api/status meldet den Zugangsweg", async () => {
  assert.equal((await (await srv.anonym().get("/api/status")).json()).extern, false);
  assert.equal((await (await srv.anonym({ extern: true }).get("/api/status")).json()).extern, true);
});

test("ohne Anmeldung kein Einreichen", async () => {
  assert.equal((await srv.anonym({ extern: true }).post("/api/eingang", rechnung())).status, 401);
});

test("Mitglied intern sieht das Kassenbuch nicht (Rolle greift weiter)", async () => {
  const mitgliedIntern = await srv.anmelden("Mitglied");
  assert.equal((await mitgliedIntern.get("/api/kassenbuch")).status, 403);
});
