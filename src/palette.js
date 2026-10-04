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
