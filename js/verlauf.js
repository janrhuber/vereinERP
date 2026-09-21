"use strict";
/* ================= Kontostand-Verlauf (Chart) =================
   Kategorial-Palette Kasse/Bank/PostFinance – fixe Reihenfolge, mit
   dataviz-Validator gegen den weissen Panel-Hintergrund geprüft (alle 3 Checks PASS). */
const VERLAUF_FARBEN = ["#2a78d6", "#128f63", "#4a3aa7"];

/* Chronologische Stützpunkte des kumulierten Kontostands pro Konto, ab dem 1. Januar
   des frühesten erfassten Jahres bis heute (durchgezogen), danach bis zur letzten
   künftigen/geplanten Buchung (gestrichelt = Prognose). */
function verlaufDaten() {
  const heute = todayISO();
  const start = kontostandStartwerte();
  const jahre = [...Object.keys(settings.konten).map(Number), ...entries.map(e => e.jahr)].filter(Number.isFinite);
  const startJahr = jahre.length ? Math.min(...jahre) : new Date().getFullYear();
  const startDatum = startJahr + "-01-01";

  const punkte = [{ datum: startDatum, werte: Object.assign({}, start), prognose: false }];
  const lauf = Object.assign({}, start);

  function anwenden(e, prognose) {
    const k = KONTEN.includes(e.konto) ? e.konto : KONTEN[KONTEN.length - 1];
    lauf[k] += e.typ === "E" ? e.betrag : -e.betrag;
    const letzter = punkte[punkte.length - 1];
    if (letzter.datum === e.datum) letzter.werte = Object.assign({}, lauf);
    else punkte.push({ datum: e.datum, werte: Object.assign({}, lauf), prognose });
  }

  entries.filter(e => e.status === "OK" && e.datum <= heute)
    .sort((a, b) => a.datum < b.datum ? -1 : 1)
    .forEach(e => anwenden(e, false));
  if (punkte[punkte.length - 1].datum < heute) {
    punkte.push({ datum: heute, werte: Object.assign({}, lauf), prognose: false });
  }

  entries.filter(e => e.status === "GEPLANT" || (e.status === "OK" && e.datum > heute))
    .sort((a, b) => a.datum < b.datum ? -1 : 1)
    .forEach(e => anwenden(e, true));

  return { punkte, heute };
}

function verlaufSvgEscape(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderVerlaufChart() {
  const container = $("verlaufChart");
  if (!container) return;
  const { punkte, heute } = verlaufDaten();
  if (punkte.length < 2) {
    container.innerHTML = '<p class="muted">Noch zu wenige Buchungen für einen Verlauf.</p>';
    return;
  }

  const W = 760, H = 260, M = { l: 58, r: 16, t: 14, b: 26 };
  const plotW = W - M.l - M.r, plotH = H - M.t - M.b;

  const t0 = new Date(punkte[0].datum).getTime();
  const t1 = new Date(punkte[punkte.length - 1].datum).getTime();
  const tSpan = Math.max(1, t1 - t0);
  const xScale = datum => M.l + (new Date(datum).getTime() - t0) / tSpan * plotW;

  let minV = 0, maxV = 0;
  for (const p of punkte) for (const k of KONTEN) { minV = Math.min(minV, p.werte[k]); maxV = Math.max(maxV, p.werte[k]); }
  if (minV === maxV) { minV -= 10; maxV += 10; }
  const pad = (maxV - minV) * 0.08;
  minV -= pad; maxV += pad;
  const yScale = v => M.t + plotH - (v - minV) / (maxV - minV) * plotH;

  const heuteIdx = punkte.findIndex(p => p.datum === heute);
  const solid = heuteIdx >= 0 ? punkte.slice(0, heuteIdx + 1) : punkte;
  const dashed = heuteIdx >= 0 ? punkte.slice(heuteIdx) : [];

  function stepPath(pts, k) {
    if (!pts.length) return "";
    let d = `M ${xScale(pts[0].datum).toFixed(1)} ${yScale(pts[0].werte[k]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const x = xScale(pts[i].datum).toFixed(1);
      d += ` L ${x} ${yScale(pts[i - 1].werte[k]).toFixed(1)} L ${x} ${yScale(pts[i].werte[k]).toFixed(1)}`;
    }
    return d;
  }

  // Gitter + Y-Achsenbeschriftung (4 Linien)
  let gitter = "", yLabels = "";
  const stufen = 4;
  for (let i = 0; i <= stufen; i++) {
    const v = minV + (maxV - minV) * i / stufen;
    const y = yScale(v).toFixed(1);
    gitter += `<line class="verlauf-grid" x1="${M.l}" y1="${y}" x2="${W - M.r}" y2="${y}"/>`;
    yLabels += `<text x="${M.l - 8}" y="${y}" text-anchor="end" dominant-baseline="middle">${chf(v)}</text>`;
  }

  // X-Achse: Jahreswechsel-Ticks
  let xLabels = "";
  const jahrVon = new Date(punkte[0].datum).getFullYear(), jahrBis = new Date(punkte[punkte.length - 1].datum).getFullYear();
  for (let j = jahrVon; j <= jahrBis; j++) {
    const d = j + "-01-01";
    if (new Date(d).getTime() < t0 || new Date(d).getTime() > t1) continue;
    const x = xScale(d).toFixed(1);
    xLabels += `<text x="${x}" y="${H - 6}" text-anchor="middle">${j}</text>`;
  }

  const heuteX = xScale(heute).toFixed(1);
  const heuteMarker = (heuteIdx >= 0 && dashed.length > 1)
    ? `<line class="verlauf-heute" x1="${heuteX}" y1="${M.t}" x2="${heuteX}" y2="${M.t + plotH}"/>` +
      `<text x="${heuteX}" y="${M.t - 2}" text-anchor="middle" font-style="italic">heute</text>`
    : "";

  const linien = KONTEN.map((k, i) => {
    const farbe = VERLAUF_FARBEN[i];
    let svg = `<path d="${stepPath(solid, k)}" fill="none" stroke="${farbe}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (dashed.length > 1) svg += `<path d="${stepPath(dashed, k)}" fill="none" stroke="${farbe}" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>`;
    return svg;
  }).join("");

  const legende = KONTEN.map((k, i) =>
    `<span><span class="dot" style="background:${VERLAUF_FARBEN[i]}"></span>${verlaufSvgEscape(k)}</span>`
  ).join("");

  container.innerHTML =
    `<div class="verlauf-legende">${legende}</div>` +
    `<div class="verlauf-wrap">` +
      `<svg class="verlauf-svg" viewBox="0 0 ${W} ${H}" id="verlaufSvg">` +
        gitter + yLabels + xLabels + linien + heuteMarker +
        `<line class="verlauf-crosshair" id="verlaufCrosshair" x1="0" y1="${M.t}" x2="0" y2="${M.t + plotH}"/>` +
        `<rect id="verlaufOverlay" x="${M.l}" y="${M.t}" width="${plotW}" height="${plotH}" fill="transparent"/>` +
      `</svg>` +
      `<div class="verlauf-tooltip" id="verlaufTooltip"></div>` +
    `</div>`;

  const svg = $("verlaufSvg");
  const overlay = $("verlaufOverlay");
  const crosshair = $("verlaufCrosshair");
  const tooltip = $("verlaufTooltip");

  function naechsterPunkt(clientX) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = 0;
    const userX = pt.matrixTransform(svg.getScreenCTM().inverse()).x;
    const t = t0 + Math.min(Math.max((userX - M.l) / plotW, 0), 1) * tSpan;
    let besterIdx = 0, besterDiff = Infinity;
    punkte.forEach((p, i) => {
      const diff = Math.abs(new Date(p.datum).getTime() - t);
      if (diff < besterDiff) { besterDiff = diff; besterIdx = i; }
    });
    return punkte[besterIdx];
  }

  overlay.addEventListener("mousemove", ev => {
    const p = naechsterPunkt(ev.clientX);
    const x = xScale(p.datum);
    crosshair.setAttribute("x1", x); crosshair.setAttribute("x2", x);
    crosshair.style.opacity = "1";
    const zeilen = KONTEN.map((k, i) =>
      `<div class="row"><span><span class="sw" style="background:${VERLAUF_FARBEN[i]}"></span>${verlaufSvgEscape(k)}</span><b>${chf(p.werte[k])}</b></div>`
    ).join("");
    tooltip.innerHTML = `<div style="margin-bottom:0.2rem"><b>${p.datum}${p.prognose ? " (Prognose)" : ""}</b></div>${zeilen}`;
    const rect = svg.getBoundingClientRect();
    const px = rect.left + (x / W) * rect.width;
    const py = rect.top + (yScale(p.werte[KONTEN[0]]) / H) * rect.height;
    tooltip.style.left = (px - container.getBoundingClientRect().left) + "px";
    tooltip.style.top = (py - container.getBoundingClientRect().top - 10) + "px";
    tooltip.style.opacity = "1";
  });
  overlay.addEventListener("mouseleave", () => {
    crosshair.style.opacity = "0";
    tooltip.style.opacity = "0";
  });
}
