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

/** Winners of one office across all states (decided, or previewed until then), split by party. */
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
    const winners = available.flatMap(([uf, tally]) =>
      tally.winners(this.page.preview).map(c => ({ ...c, state: STATES[uf].name })));
    const decided = winners.filter(c => c.decided).length;
    const previewed = winners.length - decided;
    const missing = tallies.length - available.length;

    $('status').textContent =
      `${decided} de ${seats} vagas definidas` +
      (previewed ? ` · ${previewed} em prévia` : '') + ` · ${this.refreshNote}` +
      (missing ? ` · ${missing} estado(s) sem dados no momento` : '');
    $('empty').hidden = winners.length > 0;
    $('results').hidden = winners.length === 0;
    $('preview-note').hidden = previewed === 0;
    if (!winners.length) return;

    const slices = this.#partySlices(winners);
    if (seats > winners.length) {
      slices.push({ party: PENDING, count: seats - winners.length, decided: 0, color: PENDING_COLOR });
    }
    this.pie.render(slices);
    this.#renderParties(slices, seats);
    $('names').hidden = !this.page.listNames;
    if (this.page.listNames) this.#renderList(winners);
  }

  /** Seats per party, largest first. */
  #partySlices(winners) {
    const parties = new Map();
    for (const { party, decided } of winners) {
      const slice = parties.get(party) ?? { party, count: 0, decided: 0, color: this.palette.colorOf(party) };
      slice.count += 1;
      slice.decided += decided ? 1 : 0;
      parties.set(party, slice);
    }
    return [...parties.values()].sort((a, b) => b.count - a.count || a.party.localeCompare(b.party));
  }

  #renderParties(slices, seats) {
    const share = count => (100 * count / seats).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const split = this.page.preview; // decided and previewed seats in separate columns
    const sum = key => slices.reduce((total, s) => total + (s.party === PENDING ? 0 : s[key]), 0);
    $('parties').innerHTML =
      '<thead><tr><th>Partido</th>' +
      (split ? '<th class="num">Definidas</th><th class="num">Prévia</th>' : '') +
      '<th class="num">Vagas</th><th class="num">% das vagas</th></tr></thead><tbody>' +
      slices.map(s => `<tr><td>${swatch(s.color)}${esc(s.party)}</td>` +
        (split ? `<td class="num">${s.decided}</td><td class="num">${s.party === PENDING ? 0 : s.count - s.decided}</td>` : '') +
        `<td class="num">${s.count}</td><td class="num">${share(s.count)}%</td></tr>`).join('') +
      '</tbody><tfoot><tr><th>Total em disputa</th>' +
      (split ? `<th class="num">${sum('decided')}</th><th class="num">${sum('count') - sum('decided')}</th>` : '') +
      `<th class="num">${seats}</th><th class="num">100,0%</th></tr></tfoot>`;
  }

  #renderList(winners) {
    const rows = [...winners].sort((a, b) => a.state.localeCompare(b.state) || b.votes - a.votes);
    $('list').innerHTML =
      '<thead><tr><th>Estado</th><th>Nome</th><th>Partido</th><th class="num">Votos</th>' +
      '<th class="num">% válidos</th><th>Situação</th></tr></thead><tbody>' +
      rows.map(c => `<tr><td>${c.state}</td><td>${esc(c.name)}</td><td>${swatch(this.palette.colorOf(c.party))}${esc(c.party)}</td>` +
        `<td class="num">${formatInt(c.votes)}</td><td class="num">${c.pct}%</td><td>${esc(c.note)}</td></tr>`).join('') +
      '</tbody>';
  }
}

const cargo = new URLSearchParams(location.search).get('cargo');
const page = ELECTED_PAGES[cargo] ?? ELECTED_PAGES.governador;
document.querySelector(`nav a[href$="cargo=${cargo}"]`)?.setAttribute('aria-current', 'page');
new ElectedPage(page).start();
