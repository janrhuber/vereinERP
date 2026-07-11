"use strict";
/* ================= Konstanten ================= */
const CSV_NAME = "kassenbuch.csv";
const SETTINGS_NAME = "einstellungen.json";
const BELEG_DIR = "Belege";
const CSV_HEADER = ["ID","Datum","Jahr","Typ","Kategorie","Steuercode","Beschreibung","Von_An",
                    "Betrag_CHF","Konto","Belege","Notizen","Status","VorlageID"];

const INTERVALLE = { M: ["monatlich", 1], Q: ["vierteljährlich", 3], H: ["halbjährlich", 6], J: ["jährlich", 12] };

const KONTEN = ["Kasse", "Bank", "PostFinance / Übrige"];

/* Steuercodes:
   Einnahmen: MB = Mitgliederbeitrag (steuerfrei) · SPENDE = Spende/Schenkung (steuerfrei) · STEUERBAR
   Ausgaben:  DIREKT = direkt für steuerbare Erträge (voll abziehbar) · UEBRIG = übrige Vereinsausgabe */
const STEUER_E = [
  { code: "MB",        label: "Mitgliederbeitrag (steuerfrei)" },
  { code: "SPENDE",    label: "Spende / Schenkung / Legat (steuerfrei)" },
  { code: "STEUERBAR", label: "Steuerbarer Ertrag" },
];
const STEUER_A = [
  { code: "DIREKT", label: "Direkt für steuerbare Erträge (voll abziehbar)" },
  { code: "UEBRIG", label: "Übrige Vereinsausgabe" },
];

const KATEGORIEN_E = [
  { name: "Mitgliederbeiträge",                 code: "MB" },
  { name: "Spenden / Gönnerbeiträge / Legate",  code: "SPENDE" },
  { name: "Sponsoring / Werbung (mit Gegenleistung)", code: "STEUERBAR" },
  { name: "Festwirtschaft / Anlässe / Verkauf", code: "STEUERBAR" },
  { name: "Kurse / Startgelder / Eintritte",    code: "STEUERBAR" },
  { name: "Subventionen / Beiträge öffentliche Hand", code: "STEUERBAR" },
  { name: "Zinsen / Kapitalerträge",            code: "STEUERBAR" },
  { name: "Übrige Einnahmen",                   code: "STEUERBAR" },
];
const KATEGORIEN_A = [
  { name: "Aufwand Anlässe / Festwirtschaft (Einkauf, Miete, Personal)", code: "DIREKT" },
  { name: "Aufwand Sponsoring / Werbung",       code: "DIREKT" },
  { name: "Vereinsbetrieb (Material, Trainings, Miete)", code: "UEBRIG" },
  { name: "Leiter- / Trainerentschädigungen",   code: "UEBRIG" },
  { name: "Verwaltung (Porto, Bankspesen, Software, Versicherung)", code: "UEBRIG" },
  { name: "Aus- und Weiterbildung",             code: "UEBRIG" },
  { name: "Anschaffungen / Anlagen",            code: "UEBRIG" },
  { name: "Verbandsbeiträge",                   code: "UEBRIG" },
  { name: "Übrige Ausgaben",                    code: "UEBRIG" },
];

/* ================= Zustand ================= */
let dirHandle = null;
let entries = [];
let settings = { vereinName: "", freigrenze: 20000, konten: {}, vorlagen: [] };
let editId = null;
let editVorlageId = null;
let pendingFiles = [];
let pendingExisting = [];

/* ================= Hilfsfunktionen ================= */
const $ = id => document.getElementById(id);
const chf = n => (isFinite(n) ? n : 0).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function setStatus(msg, cls) {
  const s = $("status");
  s.textContent = msg;
  s.className = cls || "";
}

function sanitizeFilename(s) {
  return s.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").slice(0, 60) || "Beleg";
}

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function steuerLabel(code) {
  const all = STEUER_E.concat(STEUER_A);
  const f = all.find(x => x.code === code);
  return f ? f.label : code;
}

function steuerBadge(code) {
  const map = {
    MB:        ["mb", "Mitgliederbeitrag"],
    SPENDE:    ["spende", "Spende steuerfrei"],
    STEUERBAR: ["stbar", "steuerbar"],
    DIREKT:    ["direkt", "voll abziehbar"],
    UEBRIG:    ["uebrig", "übriger Aufwand"],
  };
  const [cls, txt] = map[code] || ["uebrig", code];
  return `<span class="badge ${cls}">${txt}</span>`;
}

/* ================= CSV ================= */
function csvEscape(v) {
  v = String(v ?? "");
  if (/[;"\r\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function toCSV() {
  const lines = [CSV_HEADER.join(";")];
  for (const e of entries) {
    lines.push([
      e.id, e.datum, e.jahr, e.typ, e.kategorie, e.steuer, e.beschreibung, e.vonAn,
      e.betrag.toFixed(2), e.konto, e.belege.join("|"), e.notizen, e.status, e.vorlage || ""
    ].map(csvEscape).join(";"));
  }
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM → Excel liest Umlaute korrekt
}

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ";") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i+1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  const out = [];
  for (let r = 1; r < rows.length; r++) { // Zeile 0 = Header
    const c = rows[r];
    if (c.length < 10) continue;
    const typ = c[3] === "A" ? "A" : "E";
    out.push({
      id: c[0] || uid(),
      datum: c[1],
      jahr: parseInt(c[2]) || parseInt((c[1] || "").slice(0, 4)) || 0,
      typ,
      kategorie: c[4] || "",
      steuer: c[5] || (typ === "E" ? "STEUERBAR" : "UEBRIG"),
      beschreibung: c[6] || "",
      vonAn: c[7] || "",
      betrag: parseFloat(c[8]) || 0,
      konto: c[9] || KONTEN[0],
      belege: (c[10] || "").split("|").filter(Boolean),
      notizen: c[11] || "",
      status: c[12] === "GEPLANT" ? "GEPLANT" : "OK",
      vorlage: c[13] || "",
    });
  }
  return out;
}
