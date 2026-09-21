"use strict";
/* ================= Server-Modus: Anmeldung & Rollen ================= */

function zeigeLogin() {
  document.querySelectorAll("main > section").forEach(s => s.classList.add("hidden"));
  $("startHint").classList.add("hidden");
  document.querySelector(".tabs").classList.add("hidden");
  $("btnLogout").classList.add("hidden");
  $("viewLogin").classList.remove("hidden");
  setStatus("Bitte anmelden", "");
}

async function login(ev) {
  ev.preventDefault();
  $("loginFehler").textContent = "";
  let r;
  try {
    r = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: $("loginName").value.trim(), passwort: $("loginPasswort").value }),
    });
  } catch (e) {
    $("loginFehler").textContent = "Verbindungsfehler: " + e.message;
    return;
  }
  if (r.status === 401) { $("loginFehler").textContent = "Name oder Passwort falsch."; return; }
  if (r.status === 429) { $("loginFehler").textContent = "Zu viele Versuche – bitte in 15 Minuten erneut."; return; }
  if (!r.ok) { $("loginFehler").textContent = "Fehler (HTTP " + r.status + ")."; return; }
  $("loginPasswort").value = "";
  await anmeldungErfolgreich(await r.json());
}

async function logout() {
  try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch {}
  location.reload(); // einfachster kompletter Zustands-Reset
}

async function anmeldungErfolgreich(benutzer) {
  currentUser = benutzer;
  $("viewLogin").classList.add("hidden");
  $("btnLogout").classList.remove("hidden");
  document.querySelector(".tabs").classList.remove("hidden");
  await applyRole();
}

async function applyRole() {
  const kassier = currentUser.rolle === "kassier";
  document.querySelectorAll(".nur-kassier").forEach(el => el.classList.toggle("hidden", !kassier));
  $("tabErfassen").classList.toggle("hidden", !kassier);
  $("tabJahr").classList.toggle("hidden", !kassier);
  $("tabSteuer").classList.toggle("hidden", !kassier);
  $("tabEingang").classList.remove("hidden");
  if (kassier) {
    showTab("Erfassen");
    try { await loadAll(); }
    catch (e) { setStatus("Fehler beim Laden: " + e.message, "err"); }
  } else {
    showTab("Eingang");
    setStatus("Angemeldet: " + currentUser.name, "ok");
  }
  await ladeEingang();
}
