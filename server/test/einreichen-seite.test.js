"use strict";
/* Einreichen-Seite (Spec 004): von aussen wird nur sie ausgeliefert –
   die eigentliche App nicht, auch nicht verdeckt. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { starteServer } = require("./helfer");

let srv, aussen, innen;

before(async () => {
  srv = await starteServer();
  aussen = srv.anonym({ extern: true });
  innen = srv.anonym();
});

after(() => srv.stop());

test("von aussen: / ist die Einreichen-Seite", async () => {
  const r = await aussen.get("/");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Rechnung einreichen/);
  assert.doesNotMatch(html, /tabErfassen|Jahresrechnung|kassenbuch/i, "App-Oberfläche darf nicht enthalten sein");
});

test("von aussen: nur die drei Dateien der Einreichen-Seite", async () => {
  for (const p of ["/einreichen.html", "/styles.css", "/js/einreichen.js"]) {
    assert.equal((await aussen.get(p)).status, 200, p);
  }
});

test("von aussen: App-Dateien gibt es nicht", async () => {
  for (const p of ["/vereinERP.html", "/js/app.js", "/js/basis.js", "/js/eingang.js",
                   "/README.md", "/LICENSE", "/server/app.js", "/docs/README.md"]) {
    assert.equal((await aussen.get(p)).status, 404, p);
  }
});

test("Cache-Busting-Parameter stört die Whitelist nicht", async () => {
  assert.equal((await aussen.get("/styles.css?v=20261004")).status, 200);
  assert.equal((await aussen.get("/js/einreichen.js?v=20261004")).status, 200);
});

test("intern: / ist die volle App, Einreichen-Seite zusätzlich erreichbar", async () => {
  assert.match(await (await innen.get("/")).text(), /tabErfassen/);
  assert.equal((await innen.get("/einreichen.html")).status, 200);
  assert.equal((await innen.get("/js/app.js")).status, 200);
});
