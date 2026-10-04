/** The count of one office in one area (Brazil or a state), parsed from a TSE result file. */
export class Tally {
  constructor(json) {
    const office = json.carg[0];
    const { s = {}, e = {}, v = {} } = json; // absent until the area reports its first section
    this.source = { election: json.ele, office: Number(office.cd), area: json.cdabr };
    this.seats = Number(office.nv);
    // Proportional races carry the electoral quotient and the seats each party or federation holds so far.
    this.isProportional = 'qe' in office;
    this.groupSeats = office.agr.map(group => Number(group.vag) || 0);
    this.candidates = office.agr
      .flatMap((group, index) => group.par.flatMap(party => party.cand.map(c => ({
        number: c.n,
        name: c.nmu,
        party: party.sg,
        group: index,
        votes: Number(c.vap) || 0,
        pct: c.pvap || '0,00',
        valid: (c.dvt ?? 'Válido') === 'Válido',
        note: c.st || (c.dvt && c.dvt !== 'Válido' ? c.dvt : ''),
        // The "e" flag is also set for candidates going to a runoff, so only the status text counts.
        elected: (c.st ?? '').startsWith('Eleito'),
      }))))
      .sort((a, b) => b.votes - a.votes);
    this.updatedAt = `${json.dt} ${json.ht}`.trim();
    this.isFinal = json.tf === 's';
    // "md" (single-seat races only): "e" once the leader is mathematically elected, "s" for a runoff.
    this.isMathematicallyDecided = json.md === 'e';
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

  /**
   * Candidates the TSE has confirmed as elected: by status once it is published, and before
   * that the leader of a race the TSE flags as mathematically decided.
   */
  get elected() {
    const confirmed = this.candidates.filter(c => c.elected);
    if (confirmed.length || !this.isMathematicallyDecided || !this.leader) return confirmed;
    return [{ ...this.leader, note: 'Matematicamente eleito' }];
  }

  /**
   * Who would take the seats if the count ended now. Majority races: the most voted candidates.
   * Proportional races: the most voted of each party or federation, up to the seats the TSE
   * currently allocates to it (its own partial run of the quotient and remainder rules).
   */
  get projected() {
    const eligible = this.candidates.filter(c => c.valid && c.votes > 0);
    if (!this.isProportional) return eligible.slice(0, this.seats);
    return this.groupSeats.flatMap((seats, group) => eligible.filter(c => c.group === group).slice(0, seats));
  }

  /** The confirmed winners; while there are none and a preview is wanted, the projected ones. */
  winners(withPreview) {
    const confirmed = this.elected.map(c => ({ ...c, official: true }));
    if (confirmed.length || !withPreview) return confirmed;
    return this.projected.map(c => ({ ...c, official: false, note: 'Prévia' }));
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
