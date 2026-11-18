"use server";

import { criarClienteServidor } from "@/lib/supabase/server";

export type Especie = "bovino" | "ovino" | "equino";

// Uma linha do "Resumo de Movimentações": estoque inicial congelado na
// abertura do ciclo + entradas/saídas até a data escolhida. O estoque atual
// é calculado (inicial + entradas + acerto - saídas), não contado ao vivo,
// pra funcionar também com datas passadas — mesma conta do app.
export type LinhaMovimentacao = {
  categoria: string;
  grupo: string | null;
  estoqueInicial: number;
  compra: number;
  nascimento: number;
  entradaCategoria: number;
  venda: number;
  morte: number;
  saidaCategoria: number;
  consumo: number;
  furto: number;
  acertoContagem: number;
  estoqueAtual: number;
};

// Reconciliação de valor do ciclo (RPC resumo_valores_ciclo), que fecha o
// relatório de cabeças com dinheiro.
export type ValoresCiclo = {
  valorInicial: number;
  entradasAdquiridas: number;
  nascimentos: number;
  reavaliacao: number;
  valorizacaoOrganica: number;
  saidas: number;
  valorFinal: number;
  saldo: number;
  vendasValorEstoque: number;
  vendasValorRecebido: number;
  vendasSemPreco: number;
  lucroVendas: number | null;
  lucroTransferencias: number;
  diferencaNaoExplicada: number;
};

export type ResumoEspecie = {
  especie: Especie;
  linhas: LinhaMovimentacao[];
  valores: ValoresCiclo | null;
};

function numero(v: unknown) {
  return v == null ? 0 : Number(v);
}

// Ordena pelos grupos cadastrados (na ordem do cadastro de grupos); quem não
// tem grupo vai para o fim. Dentro do grupo, mantém a ordem recebida.
function ordenarPorGrupo<T extends { grupo_id: string | null }>(itens: T[], ordemGrupo: Map<string, number>) {
  const posicao = (i: T) => (i.grupo_id && ordemGrupo.has(i.grupo_id) ? ordemGrupo.get(i.grupo_id)! : Infinity);
  return itens
    .map((item, indice) => ({ item, indice }))
    .sort((a, b) => posicao(a.item) - posicao(b.item) || a.indice - b.indice)
    .map((x) => x.item);
}

export async function buscarResumoMovimentacoes(
  localId: string,
  cicloId: string,
  dataFim: string,
  especies: Especie[],
  mostrarVazias: boolean,
): Promise<{ especies: ResumoEspecie[]; cicloNome: string } | { error: string }> {
  if (especies.length === 0) return { error: "Escolha ao menos uma espécie." };
  const supabase = await criarClienteServidor();

  const { data: ciclo, error: erroCiclo } = await supabase
    .from("ciclos")
    .select("id, nome, data_inicio, data_fim")
    .eq("id", cicloId)
    .eq("local_id", localId)
    .maybeSingle();
  if (erroCiclo || !ciclo) return { error: "Ciclo não encontrado." };
  if (dataFim < ciclo.data_inicio) return { error: "A data do relatório é anterior ao início do ciclo." };

  const { data: inicial, error: erroInicial } = await supabase
    .from("estoque_ciclo_categoria")
    .select("categoria_id, estoque_inicial")
    .eq("ciclo_id", cicloId);
  if (erroInicial) return { error: "Não foi possível carregar o estoque inicial: " + erroInicial.message };
  const inicialPorCategoria = new Map((inicial ?? []).map((l) => [l.categoria_id as string, numero(l.estoque_inicial)]));

  const resultado: ResumoEspecie[] = [];
  for (const especie of especies) {
    const [categorias, grupos, movimentos, valores] = await Promise.all([
      supabase
        .from("categorias")
        .select("id, descricao, grupo_id")
        .eq("local_id", localId)
        .eq("especie", especie)
        .eq("ativo", true)
        .order("ordem")
        .order("descricao"),
      supabase.from("grupos_categoria").select("id, nome, ordem").eq("local_id", localId).eq("especie", especie),
      supabase.rpc("resumo_movimentacoes_por_categoria", {
        p_local_id: localId,
        p_especie: especie,
        p_data_inicio: ciclo.data_inicio,
        p_data_fim: dataFim,
      }),
      supabase.rpc("resumo_valores_ciclo", {
        p_local_id: localId,
        p_especie: especie,
        p_ciclo_id: cicloId,
        p_data_fim: dataFim,
      }),
    ]);
    const erro = categorias.error ?? grupos.error ?? movimentos.error ?? valores.error;
    if (erro) return { error: "Não foi possível gerar o relatório: " + erro.message };
    const nomeGrupo = new Map((grupos.data ?? []).map((g) => [g.id as string, g.nome as string]));
    const ordemGrupo = new Map((grupos.data ?? []).map((g) => [g.id as string, numero(g.ordem)]));

    const movPorCategoria = new Map(
      ((movimentos.data ?? []) as Record<string, unknown>[]).map((m) => [m.categoria_id as string, m]),
    );

    const linhas: LinhaMovimentacao[] = [];
    for (const c of ordenarPorGrupo(categorias.data ?? [], ordemGrupo)) {
      const m = movPorCategoria.get(c.id) ?? {};
      const l = {
        categoria: c.descricao as string,
        grupo: (c.grupo_id && nomeGrupo.get(c.grupo_id)) || null,
        estoqueInicial: inicialPorCategoria.get(c.id) ?? 0,
        compra: numero(m.compra),
        nascimento: numero(m.nascimento),
        entradaCategoria: numero(m.entrada_categoria),
        venda: numero(m.venda),
        morte: numero(m.morte),
        saidaCategoria: numero(m.saida_categoria),
        consumo: numero(m.consumo),
        furto: numero(m.furto),
        acertoContagem: numero(m.acerto_contagem),
      };
      const estoqueAtual =
        l.estoqueInicial +
        l.compra +
        l.nascimento +
        l.entradaCategoria +
        l.acertoContagem -
        (l.venda + l.morte + l.saidaCategoria + l.consumo + l.furto);
      const temAlgo =
        l.estoqueInicial !== 0 ||
        l.compra !== 0 ||
        l.nascimento !== 0 ||
        l.entradaCategoria !== 0 ||
        l.venda !== 0 ||
        l.morte !== 0 ||
        l.saidaCategoria !== 0 ||
        l.consumo !== 0 ||
        l.furto !== 0 ||
        l.acertoContagem !== 0;
      if (mostrarVazias || temAlgo) linhas.push({ ...l, estoqueAtual });
    }

    const v = (valores.data ?? null) as Record<string, unknown> | null;
    resultado.push({
      especie,
      linhas,
      valores: v
        ? {
            valorInicial: numero(v.valor_inicial),
            entradasAdquiridas: numero(v.entradas_adquiridas),
            nascimentos: numero(v.nascimentos),
            reavaliacao: numero(v.reavaliacao),
            valorizacaoOrganica: numero(v.valorizacao_organica),
            saidas: numero(v.saidas),
            valorFinal: numero(v.valor_final),
            saldo: numero(v.saldo),
            vendasValorEstoque: numero(v.vendas_valor_estoque),
            vendasValorRecebido: numero(v.vendas_valor_recebido),
            vendasSemPreco: numero(v.vendas_sem_preco),
            lucroVendas: v.lucro_vendas == null ? null : numero(v.lucro_vendas),
            lucroTransferencias: numero(v.lucro_transferencias),
            diferencaNaoExplicada: numero(v.diferenca_nao_explicada),
          }
        : null,
    });
  }

  return { especies: resultado, cicloNome: ciclo.nome as string };
}

export type LotacaoArea = {
  areaId: string;
  areaNome: string;
  grupo: string | null;
  itens: { categoria: string; grupo: string | null; total: number }[];
  total: number;
};

// Lotação atual (foto de agora) por área, nas espécies escolhidas. Categoria
// zerada some sempre; área zerada só aparece com mostrarVazias.
export async function buscarLotacaoAreas(
  localId: string,
  especies: Especie[],
  areaIds: string[],
  mostrarVazias: boolean,
): Promise<{ areas: LotacaoArea[] } | { error: string }> {
  if (especies.length === 0) return { error: "Escolha ao menos uma espécie." };
  if (areaIds.length === 0) return { error: "Selecione ao menos uma área." };
  const supabase = await criarClienteServidor();

  const [areas, gruposArea, gruposCategoria, contagem, categorias] = await Promise.all([
    supabase
      .from("areas")
      .select("id, nome, grupo_id")
      .eq("local_id", localId)
      .eq("ativo", true)
      .order("ordem")
      .order("nome"),
    supabase.from("grupos_area").select("id, nome, ordem").eq("local_id", localId),
    supabase.from("grupos_categoria").select("id, nome, ordem").eq("local_id", localId),
    supabase.rpc("contar_animais_por_area_e_categoria", { p_local_id: localId, p_especies: especies }),
    supabase
      .from("categorias")
      .select("id, descricao, grupo_id, especie, ordem")
      .eq("local_id", localId)
      .in("especie", especies)
      .eq("ativo", true)
      .order("ordem")
      .order("descricao"),
  ]);
  const erro = areas.error ?? gruposArea.error ?? gruposCategoria.error ?? contagem.error ?? categorias.error;
  if (erro) return { error: "Não foi possível gerar o relatório: " + erro.message };
  const nomeGrupoArea = new Map((gruposArea.data ?? []).map((g) => [g.id as string, g.nome as string]));
  const ordemGrupoArea = new Map((gruposArea.data ?? []).map((g) => [g.id as string, numero(g.ordem)]));
  const nomeGrupoCat = new Map((gruposCategoria.data ?? []).map((g) => [g.id as string, g.nome as string]));
  // Espécies diferentes têm grupos diferentes: ordena por espécie e depois
  // pela ordem do grupo dentro dela.
  const indiceEspecie = (e: string) => especies.indexOf(e as Especie);
  const ordemGrupoCat = new Map(
    (gruposCategoria.data ?? []).map((g) => [g.id as string, numero(g.ordem)]),
  );
  const categoriasOrdenadas = [...(categorias.data ?? [])]
    .map((c, indice) => ({ c, indice }))
    .sort((a, b) => {
      const pos = (c: (typeof a)["c"]) => (c.grupo_id && ordemGrupoCat.has(c.grupo_id) ? ordemGrupoCat.get(c.grupo_id)! : Infinity);
      return indiceEspecie(a.c.especie) - indiceEspecie(b.c.especie) || pos(a.c) - pos(b.c) || a.indice - b.indice;
    })
    .map((x) => x.c);

  const porArea = new Map<string, Map<string, number>>();
  for (const l of (contagem.data ?? []) as { area_id: string; categoria_id: string; total: number }[]) {
    if (!porArea.has(l.area_id)) porArea.set(l.area_id, new Map());
    porArea.get(l.area_id)!.set(l.categoria_id, numero(l.total));
  }

  const ids = new Set(areaIds);
  const resultado: LotacaoArea[] = [];
  for (const a of ordenarPorGrupo(areas.data ?? [], ordemGrupoArea)) {
    if (!ids.has(a.id)) continue;
    const contas = porArea.get(a.id) ?? new Map<string, number>();
    // Na ordem das categorias (ordem + descrição), só as com animal.
    const itens = categoriasOrdenadas
      .filter((c) => (contas.get(c.id) ?? 0) > 0)
      .map((c) => ({
        categoria: c.descricao as string,
        grupo: (c.grupo_id && nomeGrupoCat.get(c.grupo_id)) || null,
        total: contas.get(c.id)!,
      }));
    const total = itens.reduce((s, i) => s + i.total, 0);
    if (mostrarVazias || total > 0)
      resultado.push({
        areaId: a.id,
        areaNome: a.nome,
        grupo: (a.grupo_id && nomeGrupoArea.get(a.grupo_id)) || null,
        itens,
        total,
      });
  }

  return { areas: resultado };
}
