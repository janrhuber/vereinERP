"use strict";
/* ================= Formular ================= */
function kategorienFuerTyp() {
  return $("fTyp").value === "E" ? KATEGORIEN_E : KATEGORIEN_A;
}

function fillKategorien(keepIndex) {
  const kats = kategorienFuerTyp();
  const sel = $("fKategorie");
  sel.innerHTML = "";
  kats.forEach((k, i) => {
    const o = document.createElement("option");
    o.value = i; o.textContent = k.name;
    sel.appendChild(o);
  });
  sel.value = keepIndex != null && keepIndex < kats.length ? keepIndex : 0;

  const stSel = $("fSteuer");
  const codes = $("fTyp").value === "E" ? STEUER_E : STEUER_A;
  stSel.innerHTML = "";
  codes.forEach(c => {
    const o = document.createElement("option");
    o.value = c.code; o.textContent = c.label;
    stSel.appendChild(o);
  });
  stSel.value = kats[sel.value].code;
}

function wiederholungChanged() {
  const vorlage = $("fWiederholung").value !== "X";
  $("fEndeWrap").classList.toggle("hidden", !vorlage);
  $("fStatusWrap").classList.toggle("hidden", vorlage);
  document.querySelector('label[for="fDatum"]').textContent = vorlage ? "Nächste Fälligkeit" : "Datum";
}

function initForm() {
  $("fDatum").value = todayISO();
  KONTEN.forEach(k => {
    const o = document.createElement("option");
    o.value = k; o.textContent = k;
    $("fKonto").appendChild(o);
  });
  fillKategorien();
  $("fTyp").onchange = () => fillKategorien();
  $("fKategorie").onchange = () => {
    $("fSteuer").value = kategorienFuerTyp()[$("fKategorie").value].code;
  };
  $("fWiederholung").onchange = wiederholungChanged;
  $("belegInput").onchange = () => {
    pendingFiles.push(...$("belegInput").files);
    renderBelegPreview();
    $("belegInput").value = ""; // gleiche Datei erneut wählbar
  };
}

function renderBelegPreview() {
  const ul = $("belegPreview");
  ul.innerHTML = "";
  pendingExisting.forEach((p, i) => {
    const li = document.createElement("li");
    const a = document.createElement("span");
    a.className = "beleg-link"; a.textContent = "📄 " + p.split("/").pop();
    a.onclick = () => openReceipt(p);
    const rm = document.createElement("button");
    rm.className = "small danger"; rm.textContent = "×"; rm.title = "Verknüpfung entfernen (Datei bleibt im Ordner)";
    rm.onclick = () => { pendingExisting.splice(i, 1); renderBelegPreview(); };
    li.append(a, rm);
    ul.appendChild(li);
  });
  pendingFiles.forEach((f, i) => {
    const li = document.createElement("li");
    li.textContent = "🆕 " + f.name + " ";
    const rm = document.createElement("button");
    rm.className = "small danger"; rm.textContent = "×";
    rm.onclick = () => { pendingFiles.splice(i, 1); renderBelegPreview(); };
    li.appendChild(rm);
    ul.appendChild(li);
  });
}

async function pickReceipts() {
  if (!istVerbunden()) {
    alert(serverModus ? "Bitte zuerst anmelden." : "Bitte zuerst den Datenordner verbinden.");
    return;
  }
  // Server-Modus / Handy: normaler Datei-Dialog (bietet dort auch Kamera & Galerie an)
  if (serverModus || !window.showOpenFilePicker) { $("belegInput").click(); return; }
  try {
    const handles = await window.showOpenFilePicker({ multiple: true });
    for (const h of handles) pendingFiles.push(await h.getFile());
    renderBelegPreview();
  } catch (e) { if (e.name !== "AbortError") alert("Fehler: " + e.message); }
}

function resetForm() {
  editId = null;
  editVorlageId = null;
  aktiveEingangId = null; // Abbrechen verwirft eine laufende Eingang-Übernahme
  pendingFiles = []; pendingExisting = [];
  $("formTitle").textContent = "Neue Buchung erfassen";
  $("btnAbbrechen").classList.add("hidden");
  $("fDatum").value = todayISO();
  $("fBeschreibung").value = ""; $("fVonAn").value = "";
  $("fBetrag").value = ""; $("fNotizen").value = "";
  $("fWiederholung").value = "X";
  $("fWiederholung").disabled = false;
  $("fEnde").value = "";
  $("fStatus").value = "OK";
  wiederholungChanged();
  fillKategorien();
  renderBelegPreview();
}

function startEdit(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  resetForm();
  editId = id;
  $("fStatus").value = e.status;
  $("fWiederholung").disabled = true; // Einzelbuchung bleibt Einzelbuchung
  $("formTitle").textContent = "Buchung bearbeiten";
  $("btnAbbrechen").classList.remove("hidden");
  $("fDatum").value = e.datum;
  $("fTyp").value = e.typ;
  const kats = e.typ === "E" ? KATEGORIEN_E : KATEGORIEN_A;
  const ki = kats.findIndex(k => k.name === e.kategorie);
  fillKategorien(ki >= 0 ? ki : kats.length - 1);
  $("fSteuer").value = e.steuer;
  $("fBeschreibung").value = e.beschreibung;
  $("fVonAn").value = e.vonAn;
  $("fBetrag").value = e.betrag;
  $("fKonto").value = KONTEN.includes(e.konto) ? e.konto : KONTEN[0];
  $("fNotizen").value = e.notizen;
  pendingFiles = [];
  pendingExisting = [...e.belege];
  renderBelegPreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveEntry() {
  if (!istVerbunden()) {
    alert(serverModus ? "Bitte zuerst anmelden." : "Bitte zuerst den Datenordner verbinden.");
    return;
  }
  const datum = $("fDatum").value;
  const beschreibung = $("fBeschreibung").value.trim();
  const betrag = parseFloat($("fBetrag").value);
  if (!datum || !beschreibung || !isFinite(betrag) || betrag <= 0) {
    alert("Bitte Datum, Beschreibung und Betrag ausfüllen."); return;
  }
  /* --- Vorlage (wiederkehrend) speichern --- */
  if ($("fWiederholung").value !== "X") {
    if (pendingFiles.length) { alert("Belege können erst beim Bestätigen der einzelnen Buchungen angehängt werden."); return; }
    const t = {
      id: editVorlageId || uid(),
      aktiv: true,
      intervall: $("fWiederholung").value,
      naechste: datum,
      tag: parseInt(datum.slice(8, 10)),
      ende: $("fEnde").value || "",
      typ: $("fTyp").value,
      kategorie: kategorienFuerTyp()[$("fKategorie").value].name,
      steuer: $("fSteuer").value,
      beschreibung,
      vonAn: $("fVonAn").value.trim(),
      betrag,
      konto: $("fKonto").value,
      notizen: $("fNotizen").value.trim(),
    };
    if (editVorlageId) {
      const i = settings.vorlagen.findIndex(x => x.id === editVorlageId);
      const alt = settings.vorlagen[i];
      t.aktiv = alt.aktiv;
      settings.vorlagen[i] = t;
      // noch nicht bestätigte geplante Buchungen neu erzeugen
      entries = entries.filter(e => !(e.vorlage === t.id && e.status === "GEPLANT"));
    } else settings.vorlagen.push(t);
    await saveSettings();
    const created = await generateRecurring();
    if (!created) await saveCSV(); // Löschungen trotzdem persistieren
    resetForm();
    renderAll();
    return;
  }

  const jahr = parseInt(datum.slice(0, 4));
  const vonAn = $("fVonAn").value.trim();
  const belege = [...pendingExisting];
  for (const f of pendingFiles) belege.push(await storeReceipt(f, jahr, datum, beschreibung, vonAn));

  const alt = editId ? entries.find(x => x.id === editId) : null;
  const obj = {
    id: editId || uid(),
    datum, jahr,
    typ: $("fTyp").value,
    kategorie: kategorienFuerTyp()[$("fKategorie").value].name,
    steuer: $("fSteuer").value,
    beschreibung,
    vonAn: $("fVonAn").value.trim(),
    betrag,
    konto: $("fKonto").value,
    belege,
    notizen: $("fNotizen").value.trim(),
    status: $("fStatus").value,
    vorlage: alt ? alt.vorlage : "",
  };
  if (editId) {
    const i = entries.findIndex(x => x.id === editId);
    entries[i] = obj;
  } else entries.push(obj);
  entries.sort((a, b) => a.datum < b.datum ? -1 : 1);
  await saveCSV();
  if (aktiveEingangId) { // Buchung stammt aus dem Eingang → Posten als erledigt markieren
    const egId = aktiveEingangId;
    aktiveEingangId = null;
    try {
      await apiFetch("/api/eingang/" + encodeURIComponent(egId) + "/erledigt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buchungId: obj.id }),
      });
    } catch (e) {
      alert("Buchung gespeichert, aber der Eingang-Posten konnte nicht als erledigt markiert werden: " + e.message);
    }
    ladeEingang();
  }
  resetForm();
  renderAll();
}

async function deleteEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  if (!confirm(`Buchung «${e.beschreibung}» (${chf(e.betrag)} CHF) löschen?\nBelegdateien bleiben im Ordner erhalten.`)) return;
  entries = entries.filter(x => x.id !== id);
  await saveCSV();
  renderAll();
}

/* ================= Rendering: Kassenbuch ================= */
function belegLinks(e) {
  return e.belege.map(p =>
    `<span class="beleg-link" data-beleg="${p.replace(/"/g, "&quot;")}">📄 ${p.split("/").pop()}</span>`
  ).join("");
}

function renderList() {
  const jahrF = $("filterJahr").value;
  const typF = $("filterTyp").value;
  const statusF = $("filterStatus").value;
  const steuerF = $("filterSteuer").value;
  const katF = $("filterKategorie").value;
  const kontoF = $("filterKonto").value;
  const txt = $("filterText").value.toLowerCase();
  const body = $("listBody");
  body.innerHTML = "";
  let shown = 0, sumE = 0, sumA = 0, sumEg = 0, sumAg = 0;
  for (const e of [...entries].reverse()) {
    if (jahrF && String(e.jahr) !== jahrF) continue;
    if (typF && e.typ !== typF) continue;
    if (statusF && e.status !== statusF) continue;
    if (steuerF && e.steuer !== steuerF) continue;
    if (katF && e.kategorie !== katF) continue;
    if (kontoF && e.konto !== kontoF) continue;
    if (txt && !(e.beschreibung + " " + e.vonAn + " " + e.notizen + " " + e.kategorie).toLowerCase().includes(txt)) continue;
    shown++;
    const geplant = e.status === "GEPLANT";
    if (e.typ === "E") { if (geplant) sumEg += e.betrag; else sumE += e.betrag; }
    else { if (geplant) sumAg += e.betrag; else sumA += e.betrag; }
    const tr = document.createElement("tr");
    if (geplant) tr.className = "geplant";
    tr.innerHTML =
      `<td>${e.datum}${geplant ? '<br><span class="badge geplant">geplant</span>' : ""}</td>` +
      `<td>${escapeHtml(e.beschreibung)}${e.notizen ? '<br><span class="muted">' + escapeHtml(e.notizen) + "</span>" : ""}</td>` +
      `<td>${escapeHtml(e.vonAn)}</td>` +
      `<td class="muted">${escapeHtml(e.kategorie)}</td>` +
      `<td>${steuerBadge(e.steuer)}</td>` +
      `<td class="muted">${escapeHtml(e.konto)}</td>` +
      `<td class="num pos">${e.typ === "E" ? chf(e.betrag) : ""}</td>` +
      `<td class="num neg">${e.typ === "A" ? chf(e.betrag) : ""}</td>` +
      `<td>${belegLinks(e)}</td>` +
      `<td class="no-print" style="white-space:nowrap">` +
        (geplant ? `<button class="small ok" data-ok="${e.id}" title="Buchung bestätigen">✔</button> ` : "") +
        `<button class="small" data-edit="${e.id}">✏️</button> ` +
        `<button class="small danger" data-del="${e.id}">🗑</button></td>`;
    body.appendChild(tr);
  }
  $("sumE").innerHTML = chf(sumE) + (sumEg ? '<br><span class="muted">+ ' + chf(sumEg) + " geplant</span>" : "");
  $("sumA").innerHTML = chf(sumA) + (sumAg ? '<br><span class="muted">+ ' + chf(sumAg) + " geplant</span>" : "");
  $("emptyMsg").classList.toggle("hidden", shown > 0);
  $("emptyMsg").textContent = entries.length ? "Keine Buchungen für diesen Filter." : "Noch keine Buchungen.";
}

/* Kategorie-, Steuer- und Konto-Filter füllen (Auswahl bleibt erhalten) */
function fillFilterSelects() {
  const kats = KATEGORIEN_E.concat(KATEGORIEN_A).map(k => k.name);
  for (const e of entries) if (e.kategorie && !kats.includes(e.kategorie)) kats.push(e.kategorie);
  const selK = $("filterKategorie");
  const prevK = selK.value;
  selK.innerHTML = '<option value="">Alle</option>';
  kats.forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    selK.appendChild(o);
  });
  if (prevK && [...selK.options].some(o => o.value === prevK)) selK.value = prevK;

  const selS = $("filterSteuer");
  const prevS = selS.value;
  selS.innerHTML = '<option value="">Alle</option>';
  STEUER_E.concat(STEUER_A).forEach(s => {
    const o = document.createElement("option");
    o.value = s.code; o.textContent = s.label;
    selS.appendChild(o);
  });
  if (prevS && [...selS.options].some(o => o.value === prevS)) selS.value = prevS;

  const selKo = $("filterKonto");
  const prevKo = selKo.value;
  selKo.innerHTML = '<option value="">Alle</option>';
  KONTEN.forEach(k => {
    const o = document.createElement("option");
    o.value = k; o.textContent = k;
    selKo.appendChild(o);
  });
  if (prevKo && [...selKo.options].some(o => o.value === prevKo)) selKo.value = prevKo;
}

/* ================= Kontostand (Kassenbuch-Tab) ================= */
/* Frühester erfasster Anfangsbestand pro Konto (aus dem Vermögensnachweis) */
function kontostandStartwerte() {
  const jahre = Object.keys(settings.konten).map(Number).sort((a, b) => a - b);
  const start = {};
  KONTEN.forEach(k => {
    let anfang = 0;
    for (const j of jahre) {
      const cfg = settings.konten[j] && settings.konten[j][k];
      if (cfg && cfg.anfang !== undefined && cfg.anfang !== "") { anfang = parseFloat(cfg.anfang) || 0; break; }
    }
    start[k] = anfang;
  });
  return start;
}

/* Effektiver Kontostand an einem Stichtag. Zukünftig datierte Buchungen zählen NIE mit,
   auch wenn sie bereits als «Bestätigt» erfasst sind – erst am Fälligkeitstag. */
function kontostandStandAm(datum) {
  const heute = todayISO();
  const bis = datum && datum < heute ? datum : heute;
  const stand = kontostandStartwerte();
  for (const e of entries) {
    if (e.status === "GEPLANT" || e.datum > bis) continue;
    const k = KONTEN.includes(e.konto) ? e.konto : KONTEN[KONTEN.length - 1];
    stand[k] += e.typ === "E" ? e.betrag : -e.betrag;
  }
  return stand;
}

/* Künftige Buchungen (bestätigt mit Datum in der Zukunft ODER noch geplant) –
   im Kontostand oben noch nicht enthalten, bis Fälligkeitstag oder Bestätigung. */
function kuenftigeBuchungen(bisDatum) {
  const heute = todayISO();
  const liste = entries
    .filter(e => e.status === "GEPLANT" || (e.status === "OK" && e.datum > heute))
    .filter(e => !bisDatum || e.datum <= bisDatum)
    .sort((a, b) => a.datum < b.datum ? -1 : 1);
  const delta = {};
  KONTEN.forEach(k => delta[k] = 0);
  for (const e of liste) {
    const k = KONTEN.includes(e.konto) ? e.konto : KONTEN[KONTEN.length - 1];
    delta[k] += e.typ === "E" ? e.betrag : -e.betrag;
  }
  return { anzahl: liste.length, delta, liste };
}

/* Prognose per künftigem Stichtag = heutiger effektiver Stand + künftige Buchungen bis dahin */
function kontostandPrognose(datum) {
  const heute = kontostandStandAm(todayISO());
  const { delta } = kuenftigeBuchungen(datum);
  const res = {};
  KONTEN.forEach(k => res[k] = heute[k] + delta[k]);
  return res;
}

function kontostandKpiHtml(stand, cls) {
  const total = KONTEN.reduce((s, k) => s + stand[k], 0);
  return KONTEN.map(k =>
    `<div class="kpi ${cls}"><div class="l">${escapeHtml(k)}</div><div class="v">CHF ${chf(stand[k])}</div></div>`
  ).join("") + `<div class="kpi ${cls === "prognose" ? "prognose" : "purple"}">` +
    `<div class="l">Total${cls === "prognose" ? " (prognostiziert)" : ""}</div><div class="v">CHF ${chf(total)}</div></div>`;
}

function renderKontostand() {
  const heute = todayISO();
  const gewaehlt = $("kontostandDatum").value || heute;
  const el = $("kontostandKpis");

  if (gewaehlt <= heute) {
    $("kontostandLabel").textContent = gewaehlt === heute ? "💰 Kontostand heute" : "💰 Kontostand am " + gewaehlt;
    el.innerHTML = kontostandKpiHtml(kontostandStandAm(gewaehlt), "blue");
  } else {
    $("kontostandLabel").textContent = "💰 Kontostand heute · Prognose per " + gewaehlt;
    el.innerHTML = kontostandKpiHtml(kontostandStandAm(heute), "blue") +
      kontostandKpiHtml(kontostandPrognose(gewaehlt), "prognose");
  }

  const { anzahl, delta } = kuenftigeBuchungen();
  const hint = $("kontostandHinweis");
  if (anzahl > 0) {
    const summe = KONTEN.reduce((s, k) => s + delta[k], 0);
    hint.classList.remove("hidden");
    hint.textContent = `ℹ ${anzahl} künftige Buchung${anzahl === 1 ? "" : "en"} (bestätigt mit künftigem Datum ` +
      `oder noch geplant, netto CHF ${chf(summe)}) sind im Kontostand oben noch nicht enthalten. ` +
      `Für eine Prognose oben ein künftiges Datum wählen.`;
  } else {
    hint.classList.add("hidden");
  }

  if (typeof renderVerlaufChart === "function") renderVerlaufChart();
}

function fillYearSelects() {
  const years = [...new Set(entries.map(e => e.jahr))].sort((a, b) => b - a);
  const cur = new Date().getFullYear();
  if (!years.includes(cur)) years.unshift(cur);
  for (const [selId, keepAll] of [["filterJahr", true], ["jahrSelect", false], ["steuerJahr", false]]) {
    const sel = $(selId);
    const prev = sel.value;
    sel.innerHTML = keepAll ? '<option value="">Alle Jahre</option>' : "";
    years.forEach(y => {
      const o = document.createElement("option");
      o.value = y; o.textContent = y;
      sel.appendChild(o);
    });
    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  }
}

/* ================= Rendering: Jahresrechnung ================= */
function kontoSums(jahr) {
  const res = {};
  KONTEN.forEach(k => res[k] = { ein: 0, aus: 0 });
  for (const e of entries) {
    if (String(e.jahr) !== String(jahr) || e.status === "GEPLANT") continue;
    const k = KONTEN.includes(e.konto) ? e.konto : KONTEN[KONTEN.length - 1];
    if (e.typ === "E") res[k].ein += e.betrag; else res[k].aus += e.betrag;
  }
  return res;
}

function geplantHint(jahr, elId) {
  const gep = entries.filter(e => String(e.jahr) === String(jahr) && e.status === "GEPLANT");
  const el = $(elId);
  if (!gep.length) { el.classList.add("hidden"); return; }
  let ge = 0, ga = 0;
  gep.forEach(e => e.typ === "E" ? ge += e.betrag : ga += e.betrag);
  el.classList.remove("hidden");
  el.textContent = `ℹ Enthält nur bestätigte Buchungen. ${gep.length} geplante Buchungen ` +
    `(Einnahmen CHF ${chf(ge)} / Ausgaben CHF ${chf(ga)}) sind noch nicht berücksichtigt – im Kassenbuch mit ✔ bestätigen.`;
}

function renderJahr() {
  const jahr = $("jahrSelect").value;
  const name = settings.vereinName || "";
  $("vereinName").value = name;
  $("jahrTitel").textContent = "Jahresrechnung " + jahr + (name ? " – " + name : "");

  geplantHint(jahr, "jahrGeplantHint");
  const list = entries.filter(e => String(e.jahr) === jahr && e.status !== "GEPLANT");
  let ein = 0, aus = 0;
  const einKat = {}, ausKat = {};
  for (const e of list) {
    if (e.typ === "E") { ein += e.betrag; einKat[e.kategorie] = (einKat[e.kategorie] || 0) + e.betrag; }
    else { aus += e.betrag; ausKat[e.kategorie] = (ausKat[e.kategorie] || 0) + e.betrag; }
  }
  $("kEin").textContent = chf(ein);
  $("kAus").textContent = chf(aus);
  const erg = ein - aus;
  $("kErgebnis").textContent = (erg >= 0 ? "+" : "−") + chf(Math.abs(erg));
  $("kErgebnis").style.color = erg >= 0 ? "var(--green)" : "var(--red)";

  for (const [bodyId, totId, obj, tot] of [["einKat", "einKatTotal", einKat, ein], ["ausKat", "ausKatTotal", ausKat, aus]]) {
    const body = $(bodyId);
    body.innerHTML = "";
    Object.entries(obj).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(k)}</td><td class="num">${chf(v)}</td>`;
      body.appendChild(tr);
    });
    $(totId).textContent = chf(tot);
  }

  // Vermögensnachweis
  const sums = kontoSums(jahr);
  const kset = settings.konten[jahr] = settings.konten[jahr] || {};
  const body = $("vermoegenBody");
  body.innerHTML = "";
  let tAnf = 0, tEin = 0, tAus = 0, tSoll = 0, tIst = 0, istVollstaendig = true;
  KONTEN.forEach(k => {
    const cfg = kset[k] = kset[k] || {};
    const anf = parseFloat(cfg.anfang) || 0;
    const soll = anf + sums[k].ein - sums[k].aus;
    const istVal = cfg.endIst;
    const ist = parseFloat(istVal);
    const hatIst = istVal !== undefined && istVal !== "" && isFinite(ist);
    if (!hatIst) istVollstaendig = false;
    tAnf += anf; tEin += sums[k].ein; tAus += sums[k].aus; tSoll += soll;
    if (hatIst) tIst += ist;
    const diff = hatIst ? ist - soll : null;
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${escapeHtml(k)}</td>` +
      `<td class="num"><input class="mini" type="number" step="0.05" data-verm="anfang" data-konto="${escapeHtml(k)}" value="${cfg.anfang ?? ""}" placeholder="0.00"></td>` +
      `<td class="num">${chf(sums[k].ein)}</td>` +
      `<td class="num">${chf(sums[k].aus)}</td>` +
      `<td class="num"><b>${chf(soll)}</b></td>` +
      `<td class="num"><input class="mini" type="number" step="0.05" data-verm="endIst" data-konto="${escapeHtml(k)}" value="${cfg.endIst ?? ""}" placeholder="–"></td>` +
      `<td class="num" style="color:${diff === null ? "var(--muted)" : Math.abs(diff) < 0.005 ? "var(--green)" : "var(--red)"}">` +
        `${diff === null ? "–" : (Math.abs(diff) < 0.005 ? "✔ 0.00" : chf(diff))}</td>`;
    body.appendChild(tr);
  });
  const tDiff = istVollstaendig ? tIst - tSoll : null;
  $("vermoegenFoot").innerHTML =
    `<th>Total Vereinsvermögen</th><th class="num">${chf(tAnf)}</th><th class="num">${chf(tEin)}</th>` +
    `<th class="num">${chf(tAus)}</th><th class="num">${chf(tSoll)}</th>` +
    `<th class="num">${istVollstaendig ? chf(tIst) : "–"}</th>` +
    `<th class="num">${tDiff === null ? "–" : (Math.abs(tDiff) < 0.005 ? "✔ 0.00" : chf(tDiff))}</th>`;
}

async function vermoegenInput(el) {
  const jahr = $("jahrSelect").value;
  const kset = settings.konten[jahr] = settings.konten[jahr] || {};
  const cfg = kset[el.dataset.konto] = kset[el.dataset.konto] || {};
  cfg[el.dataset.verm] = el.value;
  await saveSettings();
  renderJahr();
  renderKontostand();
}

/* ================= Rendering: Steuer ================= */
function steuerCalc(jahr) {
  let mb = 0, spende = 0, ertrag = 0, direkt = 0, uebrig = 0;
  for (const e of entries) {
    if (String(e.jahr) !== String(jahr) || e.status === "GEPLANT") continue;
    if (e.typ === "E") {
      if (e.steuer === "MB") mb += e.betrag;
      else if (e.steuer === "SPENDE") spende += e.betrag;
      else ertrag += e.betrag;
    } else {
      if (e.steuer === "DIREKT") direkt += e.betrag;
      else uebrig += e.betrag;
    }
  }
  const uebrigAbziehbar = Math.max(0, uebrig - mb);
  const gewinn = Math.max(0, ertrag - direkt - uebrigAbziehbar);
  return { mb, spende, ertrag, direkt, uebrig, uebrigAbziehbar, gewinn };
}

function renderSteuer() {
  const jahr = $("steuerJahr").value;
  $("freigrenze").value = settings.freigrenze;
  const name = settings.vereinName ? " – " + settings.vereinName : "";
  $("steuerTitel").textContent = "Steuerberechnung " + jahr + name;
  geplantHint(jahr, "steuerGeplantHint");

  const c = steuerCalc(jahr);
  const rows = [
    ["Steuerbare Erträge (Festwirtschaft, Sponsoring, Zinsen …)", c.ertrag, ""],
    ["./. direkt zuordenbare Aufwendungen (voll abziehbar)", -c.direkt, ""],
    ["Übrige Vereinsausgaben", null, chf(c.uebrig)],
    ["./. gedeckt durch Mitgliederbeiträge (steuerfrei)", null, "−" + chf(Math.min(c.uebrig, c.mb))],
    ["./. übrige Ausgaben, soweit sie die Mitgliederbeiträge übersteigen", -c.uebrigAbziehbar, ""],
  ];
  const body = $("calcBody");
  body.innerHTML = "";
  for (const [label, val, sub] of rows) {
    const tr = document.createElement("tr");
    if (val === null) {
      tr.className = "sub";
      tr.innerHTML = `<td style="padding-left:1.5rem">${label}</td><td class="num">${sub}</td>`;
    } else {
      tr.innerHTML = `<td>${label}</td><td class="num">${val < 0 ? "−" + chf(-val) : chf(val)}</td>`;
    }
    body.appendChild(tr);
  }
  const sum = document.createElement("tr");
  sum.className = "sum";
  sum.innerHTML = `<td>Steuerbarer Reingewinn</td><td class="num">${chf(c.gewinn)}</td>`;
  body.appendChild(sum);
  const info = document.createElement("tr");
  info.className = "sub";
  info.innerHTML = `<td colspan="2" style="padding-top:0.6rem">Nachrichtlich: Mitgliederbeiträge CHF ${chf(c.mb)} · steuerfreie Spenden/Schenkungen CHF ${chf(c.spende)} (kein steuerbarer Ertrag)</td>`;
  body.appendChild(info);

  const fg = settings.freigrenze;
  const v = $("steuerVerdict");
  if (c.gewinn <= fg) {
    v.className = "verdict frei";
    v.innerHTML = `✔ Der Reingewinn von <b>CHF ${chf(c.gewinn)}</b> liegt innerhalb der Freigrenze von CHF ${chf(fg)} ` +
      `für Vereine mit ideellen Zwecken → <b>keine Gewinnsteuer</b> geschuldet. ` +
      `<span class="muted">Voraussetzung: Gewinn ist ausschliesslich und unwiderruflich dem ideellen Zweck gewidmet. Steuererklärung ist trotzdem einzureichen, wenn sie zugestellt wird.</span>`;
  } else {
    v.className = "verdict pflichtig";
    v.innerHTML = `⚠ Der Reingewinn von <b>CHF ${chf(c.gewinn)}</b> übersteigt die Freigrenze von CHF ${chf(fg)} ` +
      `→ der <b>gesamte</b> Gewinn ist steuerbar (Freigrenze, kein Freibetrag).`;
  }

  for (const [bodyId, filter] of [["steuerErtragBody", e => e.typ === "E" && e.steuer === "STEUERBAR" && e.status !== "GEPLANT"],
                                   ["steuerDirektBody", e => e.typ === "A" && e.steuer === "DIREKT" && e.status !== "GEPLANT"]]) {
    const tb = $(bodyId);
    tb.innerHTML = "";
    for (const e of entries) {
      if (String(e.jahr) !== String(jahr) || !filter(e)) continue;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${e.datum}</td><td>${escapeHtml(e.beschreibung)}</td>` +
        `<td class="muted">${escapeHtml(e.kategorie)}</td><td class="num">${chf(e.betrag)}</td><td>${belegLinks(e)}</td>`;
      tb.appendChild(tr);
    }
    if (!tb.children.length) tb.innerHTML = '<tr><td colspan="5" class="muted">Keine Einträge.</td></tr>';
  }
}

function renderAll() {
  fillYearSelects();
  fillFilterSelects();
  renderKontostand();
  renderVorlagen();
  renderList();
  renderJahr();
  renderSteuer();
}

/* ================= Tabs & Events ================= */
function showTab(name) {
  for (const t of ["Erfassen", "Jahr", "Steuer", "Eingang"]) {
    $("view" + t).classList.toggle("hidden", t !== name);
    $("tab" + t).classList.toggle("active", t === name);
  }
}

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-beleg],[data-edit],[data-del],[data-ok],[data-vedit],[data-vdel]");
  if (!el) return;
  if (el.dataset.beleg) openReceipt(el.dataset.beleg);
  else if (el.dataset.edit) startEdit(el.dataset.edit);
  else if (el.dataset.del) deleteEntry(el.dataset.del);
  else if (el.dataset.ok) confirmEntry(el.dataset.ok);
  else if (el.dataset.vedit) startEditVorlage(el.dataset.vedit);
  else if (el.dataset.vdel) deleteVorlage(el.dataset.vdel);
});

document.addEventListener("change", ev => {
  if (!ev.target.dataset) return;
  if (ev.target.dataset.verm) vermoegenInput(ev.target);
  else if (ev.target.dataset.vaktiv) toggleVorlage(ev.target.dataset.vaktiv, ev.target.checked);
});

function wireCommonUI() {
  initForm();
  $("btnSpeichern").onclick = saveEntry;
  $("btnAbbrechen").onclick = () => resetForm();
  $("btnBeleg").onclick = pickReceipts;
  $("filterJahr").onchange = renderList;
  $("filterTyp").onchange = renderList;
  $("filterStatus").onchange = renderList;
  $("filterSteuer").onchange = renderList;
  $("filterKategorie").onchange = renderList;
  $("filterKonto").onchange = renderList;
  $("filterText").oninput = renderList;
  $("kontostandDatum").value = todayISO();
  $("kontostandDatum").onchange = renderKontostand;
  $("btnKontostandHeute").onclick = () => { $("kontostandDatum").value = todayISO(); renderKontostand(); };
  $("tabErfassen").onclick = () => showTab("Erfassen");
  $("tabJahr").onclick = () => { showTab("Jahr"); renderJahr(); };
  $("tabSteuer").onclick = () => { showTab("Steuer"); renderSteuer(); };
  /* Beim Öffnen neu laden – sonst erscheinen Einreichungen, die seit dem
     Anmelden eingegangen sind, erst nach einem Seiten-Reload. */
  $("tabEingang").onclick = () => { showTab("Eingang"); ladeEingang(); };
  $("jahrSelect").onchange = renderJahr;
  $("steuerJahr").onchange = renderSteuer;
  $("vereinName").onchange = async () => {
    settings.vereinName = $("vereinName").value.trim();
    await saveSettings(); renderJahr(); renderSteuer();
  };
  $("freigrenze").onchange = async () => {
    settings.freigrenze = parseFloat($("freigrenze").value) || 0;
    await saveSettings(); renderSteuer();
  };
  $("btnPrintJahr").onclick = () => window.print();
  $("btnPrintSteuer").onclick = () => window.print();
}

function startFolderMode() {
  if (!window.showDirectoryPicker) {
    $("startHint").innerHTML = "<b>⚠ Browser nicht unterstützt.</b> Bitte diese Datei mit <b>Microsoft Edge</b> oder <b>Google Chrome</b> öffnen (Firefox unterstützt den lokalen Dateizugriff nicht).";
    $("btnFolder").disabled = true;
    return;
  }
  $("btnFolder").onclick = chooseFolder;
  $("btnExcel").onclick = () => alert(
    "Die Daten liegen als «" + CSV_NAME + "» im Datenordner.\n\n" +
    "• Trennzeichen: Semikolon (Schweizer Excel öffnet sie per Doppelklick korrekt)\n" +
    "• Belege liegen unter Belege\\<Jahr>\\ und sind in der Spalte «Belege» verlinkt\n\n" +
    "Tipp: Excel-Änderungen nur bei geschlossenem vereinERP machen und danach hier neu verbinden."
  );
  tryReconnect();
}

function startServerMode(st) {
  serverModus = true;
  externerZugang = !!st.extern;
  $("btnFolder").classList.add("hidden");
  $("btnExcel").classList.add("hidden");
  $("startHint").classList.add("hidden");
  $("loginForm").onsubmit = login;
  $("btnLogout").onclick = logout;
  initEingangUI();
  if (st.angemeldet && st.benutzer) anmeldungErfolgreich(st.benutzer);
  else zeigeLogin();
}

window.addEventListener("DOMContentLoaded", async () => {
  wireCommonUI();
  // Modus-Erkennung: antwortet ein Backend auf /api/status, läuft die App im Server-Modus,
  // sonst (file://, statisches Hosting) wie bisher im Ordner-Modus.
  let st = null;
  try {
    const r = await fetch("/api/status");
    if (r.ok) {
      const j = await r.json();
      if (j && j.server === true) st = j;
    }
  } catch {}
  try {
    if (st) startServerMode(st);
    else startFolderMode();
  } finally {
    /* auch bei einem Fehler aufdecken – lieber eine unfertige Seite als eine leere */
    document.body.classList.remove("startet");
  }
});
