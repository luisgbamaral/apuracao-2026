import { STATES } from './config.js';
import { CandidatePalette } from './palette.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = text => String(text).replace(/[&<>"']/g, ch => ESCAPES[ch]);
const toNumber = pct => parseFloat(pct.replace(',', '.'));
export const swatch = color => `<i class="swatch" style="background:${color}"></i>`;

export const formatInt = n => n.toLocaleString('pt-BR');

/** Every candidate of one race as a ranked bar list. */
export class RankingList {
  constructor(card, colorOf) {
    this.summary = card.querySelector('.sub');
    this.list = card.querySelector('.ranking');
    this.colorOf = colorOf;
  }

  render(tally) {
    if (!tally) {
      this.list.innerHTML = '<p class="sub">Sem dados do TSE no momento.</p>';
      return;
    }
    this.summary.textContent =
      `${tally.sectionsPct}% das seções totalizadas · ${formatInt(tally.validVotes)} votos válidos`;
    this.list.innerHTML = tally.candidates.map(c => `
      <div class="row${tally.isLeading(c) ? ' leading' : ''}">
        <span class="who">${esc(c.name)} <small>${esc(c.party)}</small>${c.note ? `<span class="tag">${esc(c.note)}</span>` : ''}</span>
        <span class="pct">${c.pct}%</span>
        <span class="votes">${formatInt(c.votes)}</span>
        <div class="bar" style="width:${toNumber(c.pct)}%;background:${this.colorOf(c)}"></div>
      </div>`).join('');
  }
}

/** Choropleth of Brazil: each state takes the colour of its leading candidate. */
export class BrazilMap {
  static SCALE = 10;
  static ORIGIN = { lon: -74, lat: 5.4 };
  static LON_SQUEEZE = Math.cos((15 * Math.PI) / 180); // equirectangular, true at Brazil's mid latitude

  constructor({ svg, legend, tooltip }, palette) {
    this.svg = svg;
    this.legend = legend;
    this.tooltip = tooltip;
    this.palette = palette;
    this.tallies = {};
    svg.addEventListener('mousemove', event => this.#showTooltip(event));
    svg.addEventListener('mouseleave', () => (tooltip.hidden = true));
  }

  async load(url) {
    const geojson = await (await fetch(url)).json();
    const ufByIbge = Object.fromEntries(Object.entries(STATES).map(([uf, s]) => [s.ibge, uf]));
    const shapes = geojson.features.map(feature => {
      const { type, coordinates } = feature.geometry;
      const polygons = (type === 'Polygon' ? [coordinates] : coordinates)
        .map(polygon => polygon.map(ring => ring.map(BrazilMap.#project)));
      return { uf: ufByIbge[feature.properties.codarea], polygons };
    });
    this.svg.innerHTML =
      shapes.map(s => `<path data-uf="${s.uf}" d="${BrazilMap.#pathData(s.polygons)}"/>`).join('') +
      shapes.map(s => {
        const [x, y] = BrazilMap.#labelPoint(s.polygons);
        return `<text x="${x}" y="${y}">${s.uf.toUpperCase()}</text>`;
      }).join('');
  }

  render(national, tallies) {
    this.tallies = tallies;
    for (const path of this.svg.querySelectorAll('path')) {
      path.style.fill = this.palette.colorOf(tallies[path.dataset.uf]?.leader);
    }
    const named = this.palette.slots
      .map(number => national.candidates.find(c => c.number === number))
      .filter(Boolean)
      .map(c => [this.palette.colorOf(c), c.name]);
    this.legend.innerHTML = [...named, [CandidatePalette.OTHER, 'Outro candidato'], [CandidatePalette.NONE, 'Sem líder definido']]
      .map(([color, label]) => `<span>${swatch(color)}${esc(label)}</span>`).join('');
  }

  #showTooltip(event) {
    const uf = event.target.dataset?.uf;
    const tally = this.tallies[uf];
    this.tooltip.hidden = !tally;
    if (!tally) return;
    this.tooltip.innerHTML =
      `<strong>${STATES[uf].name}</strong><span class="sub">${tally.sectionsPct}% das seções</span>` +
      tally.candidates.slice(0, 4).map(c =>
        `<div><span>${swatch(this.palette.colorOf(c))}${esc(c.name)}</span><b>${c.pct}%</b></div>`).join('');
    const { offsetWidth: width, offsetHeight: height } = this.tooltip;
    this.tooltip.style.left = `${Math.min(event.clientX + 14, innerWidth - width - 8)}px`;
    this.tooltip.style.top = `${Math.min(event.clientY + 14, innerHeight - height - 8)}px`;
  }

  static #project([lon, lat]) {
    const { SCALE, ORIGIN, LON_SQUEEZE } = BrazilMap;
    return [(lon - ORIGIN.lon) * LON_SQUEEZE * SCALE, (ORIGIN.lat - lat) * SCALE];
  }

  static #pathData(polygons) {
    return polygons.flat()
      .map(ring => `M${ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`)
      .join('');
  }

  /** Centre of the bounding box of the largest polygon (the mainland, for states with islands). */
  static #labelPoint(polygons) {
    const ring = polygons.map(p => p[0]).reduce((a, b) => (b.length > a.length ? b : a));
    const mid = values => (Math.min(...values) + Math.max(...values)) / 2;
    return [mid(ring.map(p => p[0])).toFixed(1), (mid(ring.map(p => p[1])) + 3).toFixed(1)];
  }
}

/** Table view of the map: leader and runner-up per state. */
export class StateTable {
  constructor(table, palette) {
    this.table = table;
    this.palette = palette;
  }

  render(tallies) {
    const cells = c => (c
      ? `<td>${swatch(this.palette.colorOf(c))}${esc(c.name)}</td><td class="num">${c.pct}%</td>`
      : '<td>–</td><td class="num">–</td>');
    const rows = Object.entries(STATES).map(([uf, state]) => {
      const tally = tallies[uf];
      return `<tr><td>${state.name}</td><td class="num">${tally ? `${tally.sectionsPct}%` : '–'}</td>` +
        `${cells(tally?.leader)}${cells(tally?.runnerUp)}</tr>`;
    });
    this.table.innerHTML =
      '<thead><tr><th>Estado</th><th class="num">Seções</th><th>Líder</th><th class="num">%</th>' +
      `<th>2º lugar</th><th class="num">%</th></tr></thead><tbody>${rows.join('')}</tbody>`;
  }
}
