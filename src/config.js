export const TSE_BASE = 'https://resultados.tse.jus.br/oficial/ele2026';

// Codes published by the TSE in oficial/comum/config/ele-c.json.
export const ELECTION = { federal: '6257', state: '6259' };
export const OFFICE = { president: '0001', governor: '0003', senator: '0005', federalDeputy: '0006' };

// Pages of winners, keyed by the "cargo" query parameter of eleitos.html. With "preview", states
// the TSE has not confirmed yet show who would win if the count ended now.
export const ELECTED_PAGES = {
  governador: { office: OFFICE.governor, title: 'Governadores eleitos', listNames: true, preview: false },
  senador: { office: OFFICE.senator, title: 'Senadores', listNames: true, preview: true },
  'deputado-federal': { office: OFFICE.federalDeputy, title: 'Deputados federais', listNames: false, preview: true },
};

export const HOME_STATE = 'pe';
export const REFRESH_MS = 60_000; // the TSE serves each file with max-age=55

export const STATES = {
  ac: { name: 'Acre', ibge: 12 },
  al: { name: 'Alagoas', ibge: 27 },
  am: { name: 'Amazonas', ibge: 13 },
  ap: { name: 'Amapá', ibge: 16 },
  ba: { name: 'Bahia', ibge: 29 },
  ce: { name: 'Ceará', ibge: 23 },
  df: { name: 'Distrito Federal', ibge: 53 },
  es: { name: 'Espírito Santo', ibge: 32 },
  go: { name: 'Goiás', ibge: 52 },
  ma: { name: 'Maranhão', ibge: 21 },
  mg: { name: 'Minas Gerais', ibge: 31 },
  ms: { name: 'Mato Grosso do Sul', ibge: 50 },
  mt: { name: 'Mato Grosso', ibge: 51 },
  pa: { name: 'Pará', ibge: 15 },
  pb: { name: 'Paraíba', ibge: 25 },
  pe: { name: 'Pernambuco', ibge: 26 },
  pi: { name: 'Piauí', ibge: 22 },
  pr: { name: 'Paraná', ibge: 41 },
  rj: { name: 'Rio de Janeiro', ibge: 33 },
  rn: { name: 'Rio Grande do Norte', ibge: 24 },
  ro: { name: 'Rondônia', ibge: 11 },
  rr: { name: 'Roraima', ibge: 14 },
  rs: { name: 'Rio Grande do Sul', ibge: 43 },
  sc: { name: 'Santa Catarina', ibge: 42 },
  se: { name: 'Sergipe', ibge: 28 },
  sp: { name: 'São Paulo', ibge: 35 },
  to: { name: 'Tocantins', ibge: 17 },
};
