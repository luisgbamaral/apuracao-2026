/** The count of one office in one area (Brazil or a state), parsed from a TSE result file. */
export class Tally {
  constructor(json) {
    const office = json.carg[0];
    const { s = {}, e = {}, v = {} } = json; // absent until the area reports its first section
    this.seats = Number(office.nv);
    this.candidates = office.agr
      .flatMap(group => group.par)
      .flatMap(party => party.cand.map(c => ({
        number: c.n,
        name: c.nmu,
        party: party.sg,
        votes: Number(c.vap) || 0,
        pct: c.pvap || '0,00',
        note: c.st || (c.dvt && c.dvt !== 'Válido' ? c.dvt : ''),
      })))
      .sort((a, b) => b.votes - a.votes);
    this.updatedAt = `${json.dt} ${json.ht}`.trim();
    this.isFinal = json.tf === 's';
    this.sectionsPct = s.pst || '0,00';
    this.validVotes = Number(v.vvc) || 0;
    this.blankPct = v.pvb || '0,00';
    this.nullPct = v.ptvn || '0,00';
    this.abstentionPct = e.pa || '0,00';
  }

  get leader() {
    return this.candidates[0]?.votes > 0 ? this.candidates[0] : null;
  }

  get runnerUp() {
    return this.leader && this.candidates[1]?.votes > 0 ? this.candidates[1] : null;
  }

  /** Candidates currently holding one of the seats in dispute. */
  isLeading(candidate) {
    return candidate.votes > 0 && this.candidates.indexOf(candidate) < this.seats;
  }
}

/** Reads the public result files. The TSE echoes the Origin header, so no proxy is needed. */
export class TseClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /** Resolves to a Tally, or null when the file is unavailable. */
  async tally(election, office, area) {
    const url = `${this.baseUrl}/${election}/dados/${area}/${area}-c${office}-e${election.padStart(6, '0')}-u.json`;
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return new Tally(await response.json());
    } catch (error) {
      console.warn(`TSE file unavailable: ${url}`, error);
      return null;
    }
  }
}
