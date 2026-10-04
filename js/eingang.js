"use strict";
/* ================= Eingang: Rechnungen einreichen & übernehmen ================= */
let egDatei = null; // fürs Einreichen gewählte Datei
let egListe = [];   // zuletzt geladene Eingang-Posten

function initEingangUI() {
  $("btnEgDatei").onclick = () => $("egDateiInput").click();
  $("egDateiInput").onchange = () => {
    egDatei = $("egDateiInput").files[0] || null;
    $("egDateiName").textContent = egDatei ? egDatei.name : "";
    $("egDateiInput").value = "";
  };
  $("btnEingangSenden").onclick = sendeEingang;
}

async function sendeEingang() {
  const einreicher = $("egEinreicher").value.trim();
  const betrag = parseFloat($("egBetrag").value);
  const beschreibung = $("egBeschreibung").value.trim();
  if (!einreicher) { alert("Bitte deinen Namen angeben – sonst weiss der Kassier nicht, wem er zurückzahlen soll."); return; }
  if (!isFinite(betrag) || betrag <= 0 || !beschreibung) {
    alert("Bitte Betrag und Beschreibung ausfüllen."); return;
  }
  if (!egDatei) { alert("Bitte Rechnung/Quittung anhängen (Foto oder PDF)."); return; }
  const fd = new FormData();
  fd.append("einreicher", einreicher);
  fd.append("betrag", betrag);
  fd.append("zahlungsinfo", $("egZahlungsinfo").value.trim());
  fd.append("beschreibung", beschreibung);
  fd.append("datei", egDatei, egDatei.name);
  try { await apiFetch("/api/eingang", { method: "POST", body: fd }); }
  catch (e) { alert("Fehler beim Einreichen: " + e.message); return; }
  /* Name bleibt stehen: wer mehrere Belege einreicht, muss ihn nicht neu tippen */
  $("egBetrag").value = ""; $("egZahlungsinfo").value = ""; $("egBeschreibung").value = "";
  egDatei = null; $("egDateiName").textContent = "";
  if (!externerZugang) await ladeEingang(); // von aussen gibt es keine Liste
  alert("✔ Rechnung eingereicht – der Kassier prüft und bezahlt sie.");
}

async function ladeEingang() {
  try { egListe = await (await apiFetch("/api/eingang")).json(); }
  catch { egListe = []; }
  renderEingang();
}

function renderEingang() {
  const datum = iso => (iso || "").slice(0, 10);

  const eigene = egListe.filter(p => p.name === currentUser.name);
  const eb = $("egEigeneBody");
  eb.innerHTML = "";
  for (const p of [...eigene].reverse()) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${datum(p.eingereicht)}</td><td>${escapeHtml(p.beschreibung)}</td>` +
      `<td class="num">${chf(p.betrag)}</td>` +
      `<td>${p.status === "ERLEDIGT"
        ? '<span class="badge mb">erledigt</span>'
        : '<span class="badge geplant">offen</span>'}</td>`;
    eb.appendChild(tr);
  }
  $("egEigeneEmpty").classList.toggle("hidden", eigene.length > 0);

  if (currentUser.rolle === "kassier") {
    const offene = egListe.filter(p => p.status === "OFFEN");
    const kb = $("egListeBody");
    kb.innerHTML = "";
    for (const p of [...offene].reverse()) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${datum(p.eingereicht)}</td><td>${escapeHtml(p.einreicher || p.name)}</td>` +
        `<td>${escapeHtml(p.beschreibung)}</td><td class="num">${chf(p.betrag)}</td>` +
        `<td>${escapeHtml(p.zahlungsinfo)}</td>` +
        `<td><span class="beleg-link" data-egdatei="${p.id}">📄 ${escapeHtml((p.datei || "").split("/").pop())}</span></td>` +
        `<td style="white-space:nowrap">` +
          `<button class="small ok" data-egbuchen="${p.id}" title="Als Buchung übernehmen">→ Buchung</button> ` +
          `<button class="small danger" data-egdel="${p.id}">🗑</button></td>`;
      kb.appendChild(tr);
    }
    $("egListeEmpty").classList.toggle("hidden", offene.length > 0);
    $("tabEingang").textContent = "📥 Eingang" + (offene.length ? " (" + offene.length + ")" : "");
  }
}

/* Kassier: Eingang-Posten ins Buchungsformular übernehmen (nutzt den normalen Speicherweg) */
async function uebernehmeEingang(id) {
  const p = egListe.find(x => x.id === id);
  if (!p) return;
  let file;
  try {
    const r = await apiFetch("/api/eingang/datei/" + encodeURIComponent(id));
    const blob = await r.blob();
    file = new File([blob], (p.datei || "Beleg").split("/").pop(), { type: blob.type });
  } catch (e) { alert("Datei konnte nicht geladen werden: " + e.message); return; }
  resetForm();
  aktiveEingangId = id; // nach resetForm setzen – das nullt es
  $("fTyp").value = "A";
  fillKategorien();
  $("fBetrag").value = p.betrag;
  $("fBeschreibung").value = p.beschreibung;
  $("fVonAn").value = p.einreicher || p.name;
  $("fNotizen").value = p.zahlungsinfo || "";
  $("fStatus").value = "GEPLANT";
  pendingFiles.push(file);
  renderBelegPreview();
  $("formTitle").textContent = "Rechnung aus Eingang übernehmen";
  $("btnAbbrechen").classList.remove("hidden");
  showTab("Erfassen");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loescheEingang(id) {
  const p = egListe.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Eingang «${p.beschreibung}» (${chf(p.betrag)} CHF) von ${p.einreicher || p.name} löschen?\nDie Datei wird mitgelöscht.`)) return;
  try { await apiFetch("/api/eingang/" + encodeURIComponent(id), { method: "DELETE" }); }
  catch (e) { alert("Fehler: " + e.message); return; }
  await ladeEingang();
}

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-egdatei],[data-egbuchen],[data-egdel]");
  if (!el) return;
  if (el.dataset.egdatei) window.open("/api/eingang/datei/" + encodeURIComponent(el.dataset.egdatei), "_blank");
  else if (el.dataset.egbuchen) uebernehmeEingang(el.dataset.egbuchen);
  else if (el.dataset.egdel) loescheEingang(el.dataset.egdel);
});
