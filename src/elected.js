import { ELECTED_PAGES, ELECTION, REFRESH_MS, STATES, TSE_BASE } from './config.js';
import { LivePage } from './live-page.js';
import { PartyPalette } from './palette.js';
import { TseClient } from './tse.js';
import { esc, formatInt, swatch } from './views.js';

const $ = id => document.getElementById(id);
const PENDING = 'A definir';
const PENDING_COLOR = 'var(--none)';

/** Pie chart of seats per party, out of all seats in dispute. */
class PartyPie {
  static CENTER = 100;
  static RADIUS = 96;
  static LABEL_RADIUS = 62;
  static MIN_LABEL_SHARE = 0.05; // smaller slices are named in the table beside the chart

  constructor(svg) {
    this.svg = svg;
  }

  render(slices) {
    const total = slices.reduce((sum, s) => sum + s.count, 0);
    let start = 0;
    const paths = [];
    const labels = [];
    for (const slice of slices) {
      const share = slice.count / total;
      const title = `<title>${esc(slice.party)}: ${slice.count}</title>`;
      paths.push(share === 1
        ? `<circle cx="${PartyPie.CENTER}" cy="${PartyPie.CENTER}" r="${PartyPie.RADIUS}" fill="${slice.color}">${title}</circle>`
        : `<path d="${PartyPie.#wedge(start, start + share)}" fill="${slice.color}">${title}</path>`);
      if (share >= PartyPie.MIN_LABEL_SHARE) {
        const [x, y] = PartyPie.#point(start + share / 2, PartyPie.LABEL_RADIUS);
        labels.push(`<text x="${x}" y="${y}">${esc(slice.party)} ${slice.count}</text>`);
      }
      start += share;
    }
    this.svg.innerHTML = paths.join('') + labels.join('');
  }

  /** Point on the circle at a fraction of a full turn, clockwise from 12 o'clock. */
  static #point(turn, radius) {
    const angle = turn * 2 * Math.PI;
    return [PartyPie.CENTER + radius * Math.sin(angle), PartyPie.CENTER - radius * Math.cos(angle)]
      .map(v => v.toFixed(2));
  }

  static #wedge(from, to) {
    const { CENTER, RADIUS } = PartyPie;
    const largeArc = to - from > 0.5 ? 1 : 0;
    return `M${CENTER},${CENTER}L${PartyPie.#point(from, RADIUS)}A${RADIUS},${RADIUS} 0 ${largeArc} 1 ${PartyPie.#point(to, RADIUS)}Z`;
  }
}

/** Winners confirmed by the TSE for one office, across all states, with the split by party. */
class ElectedPage extends LivePage {
  constructor(page) {
    super(REFRESH_MS);
    this.page = page;
    this.client = new TseClient(TSE_BASE);
    this.palette = new PartyPalette();
    this.pie = new PartyPie($('pie'));
    document.title = `${page.title} · Apuração 2026`;
    $('title').textContent = page.title;
  }

  load() {
    return Promise.all(Object.keys(STATES).map(async uf =>
      [uf, await this.client.tally(ELECTION.state, this.page.office, uf)]));
  }

  render(tallies) {
    const available = tallies.filter(([, tally]) => tally);
    const seats = available.reduce((sum, [, tally]) => sum + tally.seats, 0);
    const elected = available.flatMap(([uf, tally]) => tally.elected.map(c => ({ ...c, state: STATES[uf].name })));
    const missing = tallies.length - available.length;

    $('status').textContent =
      `${elected.length} de ${seats} vagas com eleito confirmado pelo TSE · ${this.refreshNote}` +
      (missing ? ` · ${missing} estado(s) sem dados no momento` : '');
    $('empty').hidden = elected.length > 0;
    $('results').hidden = elected.length === 0;
    if (!elected.length) return;

    const slices = this.#partySlices(elected);
    if (seats > elected.length) slices.push({ party: PENDING, count: seats - elected.length, color: PENDING_COLOR });
    this.pie.render(slices);
    this.#renderParties(slices, seats);
    $('names').hidden = !this.page.listNames;
    if (this.page.listNames) this.#renderList(elected);
  }

  /** Seats per party, largest first. */
  #partySlices(elected) {
    const counts = new Map();
    for (const { party } of elected) counts.set(party, (counts.get(party) ?? 0) + 1);
    return [...counts]
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
      .map(([party, count]) => ({ party, count, color: this.palette.colorOf(party) }));
  }

  #renderParties(slices, seats) {
    const share = count => (100 * count / seats).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    $('parties').innerHTML =
      '<thead><tr><th>Partido</th><th class="num">Vagas</th><th class="num">% das vagas</th></tr></thead><tbody>' +
      slices.map(s => `<tr><td>${swatch(s.color)}${esc(s.party)}</td><td class="num">${s.count}</td>` +
        `<td class="num">${share(s.count)}%</td></tr>`).join('') +
      `</tbody><tfoot><tr><th>Total em disputa</th><th class="num">${seats}</th><th class="num">100,0%</th></tr></tfoot>`;
  }

  #renderList(elected) {
    const rows = [...elected].sort((a, b) => a.state.localeCompare(b.state) || b.votes - a.votes);
    $('list').innerHTML =
      '<thead><tr><th>Estado</th><th>Nome</th><th>Partido</th><th class="num">Votos</th>' +
      '<th class="num">% válidos</th><th>Situação no TSE</th></tr></thead><tbody>' +
      rows.map(c => `<tr><td>${c.state}</td><td>${esc(c.name)}</td><td>${swatch(this.palette.colorOf(c.party))}${esc(c.party)}</td>` +
        `<td class="num">${formatInt(c.votes)}</td><td class="num">${c.pct}%</td><td>${esc(c.note)}</td></tr>`).join('') +
      '</tbody>';
  }
}

const cargo = new URLSearchParams(location.search).get('cargo');
const page = ELECTED_PAGES[cargo] ?? ELECTED_PAGES.governador;
document.querySelector(`nav a[href$="cargo=${cargo}"]`)?.setAttribute('aria-current', 'page');
new ElectedPage(page).start();
