/** Maps parties to colours: a fixed colour for the largest parties, spare ones for the rest. */
export class PartyPalette {
  static OTHER = 'var(--other)';
  static FIXED = {
    PT: '#d7263d',
    PL: '#2a78d6',
    UNIÃO: '#1baf7a',
    PP: '#0e7c86',
    PSD: '#eb6834',
    MDB: '#008300',
    REPUBLICANOS: '#6f5fd0',
    PSB: '#eda100',
    PDT: '#e87ba4',
    PSDB: '#8c6d3f',
    PODE: '#7a9a01',
    PSOL: '#b04ac2',
  };
  static SPARE = [
    '#5d6d7e', '#c08552', '#3ec1d3', '#a3586a', '#4f7f3a', '#c2a83e', '#7d7fbf', '#d99a7c', '#2f6f73',
    '#9c6b98', '#6b8e9f', '#b5651d', '#4b9b8f', '#8a8f2a', '#c76f8e', '#3d5a80', '#a08060', '#6a4c93',
  ];

  #assigned = new Map();

  /** A party keeps its colour for the whole visit, whatever its rank becomes. */
  colorOf(party) {
    if (PartyPalette.FIXED[party]) return PartyPalette.FIXED[party];
    if (!this.#assigned.has(party)) {
      this.#assigned.set(party, PartyPalette.SPARE[this.#assigned.size] ?? PartyPalette.OTHER);
    }
    return this.#assigned.get(party);
  }
}

/**
 * Maps presidential candidates to colours. Colour follows the candidate, not the rank:
 * the national leaders seen on the first visit keep their slot for good, so a state
 * never changes colour just because the national order flipped.
 */
export class CandidatePalette {
  static STORAGE_KEY = 'apuracao2026.slots';
  static SLOTS = 3; // most hues that stay distinguishable on a choropleth, incl. colour-blind readers
  static OTHER = 'var(--other)';
  static NONE = 'var(--none)';

  constructor() {
    this.slots = this.#load();
  }

  /** Fixes the slots from the national tally, once there are votes to rank. */
  assign(national) {
    if (this.slots.length || !national.leader) return;
    this.slots = national.candidates.slice(0, CandidatePalette.SLOTS).map(c => c.number);
    try {
      localStorage.setItem(CandidatePalette.STORAGE_KEY, JSON.stringify(this.slots));
    } catch { /* storage blocked: slots still hold for this visit */ }
  }

  colorOf(candidate) {
    if (!candidate) return CandidatePalette.NONE;
    const slot = this.slots.indexOf(candidate.number);
    return slot < 0 ? CandidatePalette.OTHER : `var(--series-${slot + 1})`;
  }

  #load() {
    try {
      return JSON.parse(localStorage.getItem(CandidatePalette.STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  }
}
