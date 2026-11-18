// Filtro de área dos históricos de ocorrências: um registro pode ter animais
// de várias áreas, então o recorte é por animal. Cada registro fica só com os
// animais das áreas escolhidas (e some se não sobrar nenhum), para contagens
// e resumos baterem com o filtro.

type ComArea = { area_nome: string | null };

export function nomeArea(a: ComArea) {
  return a.area_nome && a.area_nome !== "—" ? a.area_nome : "Sem área";
}

export function recortarPorArea<G extends { animais: ComArea[] }>(registros: G[], areas: Set<string>): G[] {
  if (areas.size === 0) return registros;
  return registros
    .map((r) => ({ ...r, animais: r.animais.filter((a) => areas.has(nomeArea(a))) }))
    .filter((r) => r.animais.length > 0);
}

export function opcoesArea(registros: { animais: ComArea[] }[]) {
  const nomes = new Set(registros.flatMap((r) => r.animais.map(nomeArea)));
  return Array.from(nomes)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((n) => ({ value: n, label: n }));
}
