# Apuração 2026

Live dashboard of the 2026 Brazilian general election count, read straight from the public result files of the Superior Electoral Court (TSE).

**Live:** https://luisgbamaral.github.io/apuracao-2026/

- Map of Brazil coloured by the presidential candidate leading in each state, with the national count beside it.
- Table with leader and runner-up per state.
- Pernambuco in detail: president, governor and senator, every candidate listed.
- Winners confirmed by the TSE for governor, senator and federal deputy, with the share of seats per party.
- Refreshes every 60 seconds, in light or dark mode.

## How it works

The page is fully static: no build step, no dependencies, no backend. The TSE publishes one JSON file per office and area and allows cross-origin reads, so each visitor's browser fetches the 30 files it needs (Brazil, the 27 states, and Pernambuco's governor and senator races) and redraws the page.

```
index.html          the count: map, national tally, Pernambuco
eleitos.html        confirmed winners for one office, chosen by ?cargo=
styles.css          theme tokens and layout
data/states.geojson state boundaries (IBGE)
src/config.js       election codes, states, refresh interval
src/tse.js          TseClient (fetch) and Tally (one office in one area)
src/palette.js      CandidatePalette (stable colour per candidate)
src/views.js        BrazilMap, RankingList, StateTable
src/live-page.js    LivePage (refresh loop shared by both pages)
src/app.js          Dashboard (the count: index.html)
src/elected.js      ElectedPage and PartyPie (confirmed winners: eleitos.html?cargo=...)
```

Design notes:

- **Colour follows the candidate, not the rank.** The three national leaders seen on the first visit keep their colour, so a state never repaints because the national order flipped. Three is the most hues that stay distinguishable on a map, including for colour-blind readers; any other candidate leading a state is shown in grey and named in the tooltip and the table.
- **The map is plain SVG.** State boundaries are projected with an equirectangular projection, so no mapping library is needed.
- **Only confirmed winners count as elected.** A candidate enters the winners pages when the TSE publishes an "Eleito" status, or flags a single-seat race as mathematically decided. The file's `e` flag is not used, because it is also set for candidates going to a runoff.
- **A missing file never blanks the page.** Each request fails on its own and the affected panel says so.

## Run locally

ES modules need an HTTP origin, so serve the folder instead of opening the file:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Adapting

Election and office codes live in `src/config.js` and come from the TSE's `oficial/comum/config/ele-c.json`. Change `HOME_STATE` to detail another state, or point `ELECTION` at the runoff codes for the second round.

## Data

Results: [TSE](https://resultados.tse.jus.br). Boundaries: [IBGE](https://servicodados.ibge.gov.br/api/docs/malhas). Counts are partial until the TSE closes the tally. This project is not affiliated with the TSE.
