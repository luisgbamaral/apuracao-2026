import { ELECTION, HOME_STATE, OFFICE, REFRESH_MS, STATES, TSE_BASE } from './config.js';
import { CandidatePalette } from './palette.js';
import { TseClient } from './tse.js';
import { BrazilMap, RankingList, StateTable, formatInt } from './views.js';

const $ = id => document.getElementById(id);

class Dashboard {
  constructor() {
    this.client = new TseClient(TSE_BASE);
    this.palette = new CandidatePalette();
    const byCandidate = c => this.palette.colorOf(c);
    const neutral = () => 'var(--bar)';
    this.status = $('status');
    this.tiles = $('tiles');
    this.map = new BrazilMap({ svg: $('map'), legend: $('legend'), tooltip: $('tooltip') }, this.palette);
    this.table = new StateTable($('state-table'), this.palette);
    this.national = new RankingList($('national'), byCandidate);
    this.homePresident = new RankingList($('home-president'), byCandidate);
    this.homeGovernor = new RankingList($('home-governor'), neutral);
    this.homeSenator = new RankingList($('home-senator'), neutral);
  }

  async start() {
    await this.map.load('data/states.geojson');
    await this.refresh();
    setInterval(() => this.refresh(), REFRESH_MS);
    // Browsers throttle timers in background tabs, so catch up as soon as the tab is shown again.
    document.addEventListener('visibilitychange', () => document.hidden || this.refresh());
  }

  #refreshId = 0;

  async refresh() {
    const refreshId = ++this.#refreshId;
    const ufs = Object.keys(STATES);
    const president = area => this.client.tally(ELECTION.federal, OFFICE.president, area);
    const [national, governor, senator, ...byState] = await Promise.all([
      president('br'),
      this.client.tally(ELECTION.state, OFFICE.governor, HOME_STATE),
      this.client.tally(ELECTION.state, OFFICE.senator, HOME_STATE),
      ...ufs.map(president),
    ]);
    if (refreshId !== this.#refreshId) return; // a newer refresh started meanwhile; never paint older data over it
    if (!national) {
      this.status.textContent = 'Não foi possível consultar o TSE. Nova tentativa em instantes.';
      return;
    }
    const states = Object.fromEntries(ufs.map((uf, i) => [uf, byState[i]]));

    this.palette.assign(national);
    this.#renderHeader(national);
    this.map.render(national, states);
    this.table.render(states);
    this.national.render(national);
    this.homePresident.render(states[HOME_STATE]);
    this.homeGovernor.render(governor);
    this.homeSenator.render(senator);
  }

  #renderHeader(national) {
    const now = new Date().toLocaleTimeString('pt-BR');
    this.status.textContent =
      `Última totalização do TSE: ${national.updatedAt} · página atualizada às ${now} (a cada ${REFRESH_MS / 1000} s)` +
      (national.isFinal ? ' · totalização encerrada' : '');
    this.tiles.innerHTML = [
      [`${national.sectionsPct}%`, 'seções totalizadas'],
      [formatInt(national.validVotes), 'votos válidos'],
      [`${national.blankPct}%`, 'brancos'],
      [`${national.nullPct}%`, 'nulos'],
      [`${national.abstentionPct}%`, 'abstenção'],
    ].map(([value, label]) => `<div class="tile"><b>${value}</b><span>${label}</span></div>`).join('');
  }
}

new Dashboard().start();
