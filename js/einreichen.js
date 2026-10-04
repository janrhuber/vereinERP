"use strict";
/* ================= Öffentliche Einreichen-Seite =================
   Eigenständig, ohne die übrigen App-Skripte: von aussen wird nur diese
   Seite ausgeliefert. Spricht ausschliesslich mit /api/status, /api/login,
   /api/logout und POST /api/eingang. Spec: docs/specs/004-einreichen-seite.md */

const $ = id => document.getElementById(id);
const NAME_KEY = "vereinerp.einreicher"; // Name bleibt auf dem eigenen Gerät gespeichert

function zeige(ansicht) {
  $("viewLogin").classList.toggle("hidden", ansicht !== "login");
  $("viewFormular").classList.toggle("hidden", ansicht !== "formular");
  $("btnLogout").classList.toggle("hidden", ansicht !== "formular");
  document.body.classList.remove("startet");
}

function fehler(text) { $("fehler").textContent = text || ""; }

function merkeName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* privater Modus – egal */ }
}
function gemerkterName() {
  try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; }
}

async function start() {
  let angemeldet = false;
  try {
    const st = await (await fetch("/api/status", { credentials: "same-origin" })).json();
    angemeldet = !!st.angemeldet;
  } catch {
    fehler("Server nicht erreichbar – bitte später nochmals versuchen.");
  }
  $("einreicher").value = gemerkterName();
  zeige(angemeldet ? "formular" : "login");
}

async function login(ev) {
  ev.preventDefault();
  fehler("");
  let r;
  try {
    r = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: $("loginName").value.trim(), passwort: $("loginPasswort").value }),
    });
  } catch { fehler("Keine Verbindung zum Server."); return; }
  $("loginPasswort").value = "";
  if (r.status === 401) { fehler("Name oder Passwort falsch."); return; }
  if (r.status === 429) { fehler("Zu viele Versuche – bitte in 15 Minuten erneut."); return; }
  if (!r.ok) { fehler("Anmeldung fehlgeschlagen (HTTP " + r.status + ")."); return; }
  zeige("formular");
}

async function einreichen(ev) {
  ev.preventDefault();
  fehler("");
  $("erfolg").classList.add("hidden");

  const einreicher = $("einreicher").value.trim();
  const datei = $("datei").files[0];
  if (!einreicher) { fehler("Bitte deinen Namen angeben – sonst weiss der Kassier nicht, wem er zurückzahlen soll."); return; }
  if (!datei) { fehler("Bitte die Rechnung anhängen (Foto oder PDF)."); return; }

  const fd = new FormData();
  fd.append("einreicher", einreicher);
  fd.append("betrag", $("betrag").value);
  fd.append("beschreibung", $("beschreibung").value.trim());
  fd.append("zahlungsinfo", $("zahlungsinfo").value.trim());
  fd.append("datei", datei, datei.name);

  $("btnSenden").disabled = true;
  $("btnSenden").textContent = "Wird gesendet …";
  let r;
  try {
    r = await fetch("/api/eingang", { method: "POST", credentials: "same-origin", body: fd });
  } catch {
    fehler("Keine Verbindung zum Server – die Rechnung wurde NICHT eingereicht.");
    return;
  } finally {
    $("btnSenden").disabled = false;
    $("btnSenden").textContent = "Einreichen";
  }

  if (r.status === 401) { fehler("Sitzung abgelaufen – bitte neu anmelden."); zeige("login"); return; }
  if (!r.ok) {
    let msg = "Einreichen fehlgeschlagen (HTTP " + r.status + ").";
    try { const j = await r.json(); if (j && j.fehler) msg = j.fehler; } catch {}
    fehler(msg);
    return;
  }

  merkeName(einreicher);
  /* Name und Zahlungsinfo bleiben stehen – wer mehrere Belege hat, muss sie
     nicht neu tippen. Betrag, Zweck und Datei gehören zur einzelnen Rechnung. */
  $("betrag").value = "";
  $("beschreibung").value = "";
  $("datei").value = "";
  $("erfolg").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function logout() {
  try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch {}
  location.reload();
}

$("loginForm").addEventListener("submit", login);
$("formular").addEventListener("submit", einreichen);
$("btnLogout").addEventListener("click", logout);
start();
