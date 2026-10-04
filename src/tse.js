/** The count of one office in one area (Brazil or a state), parsed from a TSE result file. */
export class Tally {
  constructor(json) {
    const office = json.carg[0];
    const { s = {}, e = {}, v = {} } = json; // absent until the area reports its first section
    this.source = { election: json.ele, office: Number(office.cd), area: json.cdabr };
    this.seats = Number(office.nv);
    this.candidates = office.agr
      .flatMap(group => group.par)
      .flatMap(party => party.cand.map(c => ({
        number: c.n,
        name: c.nmu,
        party: party.sg,
        votes: Number(c.vap) || 0,
        pct: c.pvap || '0,00',
        note: c.dvt && c.dvt !== 'Válido' ? c.dvt : '', // vote validity only; the outcome (c.st) is not shown
      })))
      .sort((a, b) => b.votes - a.votes);
    this.updatedAt = `${json.dt} ${json.ht}`.trim();
    this.isFinal = json.tf === 's';
    this.sectionsPct = s.pst || '0,00';
    this.validVotes = Number(v.vv) || 0; // vvc would also count votes annulled sub judice
    this.blankPct = v.pvb || '0,00';
    this.nullPct = v.ptvn || '0,00';
    this.abstentionPct = e.pa || '0,00';
  }

  /** The candidate strictly ahead; null while there are no votes or the top two are tied. */
  get leader() {
    const [first, second] = this.candidates;
    return first?.votes > (second?.votes ?? 0) ? first : null;
  }

  get runnerUp() {
    return this.leader && this.candidates[1].votes > 0 ? this.candidates[1] : null;
  }

  /** Candidates currently holding one of the seats in dispute. */
  isLeading(candidate) {
    return candidate.votes > 0 && this.candidates.indexOf(candidate) < this.seats;
  }
}

/** Reads the public result files. The TSE echoes the Origin header, so no proxy is needed. */
export class TseClient {
  #lastGood = new Map();

  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * Resolves to the Tally of one office in one area. If the file is unavailable or is not
   * the one requested, falls back to the last good Tally (stale beats wrong), or null.
   */
  async tally(election, office, area) {
    const url = `${this.baseUrl}/${election}/dados/${area}/${area}-c${office}-e${election.padStart(6, '0')}-u.json`;
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const tally = new Tally(await response.json());
      const { source } = tally;
      if (source.election !== election || source.office !== Number(office) || source.area !== area) {
        throw new Error(`unexpected content: ${JSON.stringify(source)}`);
      }
      this.#lastGood.set(url, tally);
    } catch (error) {
      console.warn(`TSE file unavailable: ${url}`, error);
    }
    return this.#lastGood.get(url) ?? null;
  }
}
