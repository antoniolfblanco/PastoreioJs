import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TabelaAnimaisVenda } from "./tabela-animais-venda";
import { HistoricoVendas } from "./historico-vendas";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";

export type AnimalParaVenda = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  sexo: Sexo;
  grau_sangue: string;
  categoria_descricao: string;
  area_nome: string;
  raca_descricao: string;
};

export type AnimalDaVenda = {
  id: string;
  identificacao: string;
  categoria_descricao: string;
  peso_venda: number | null;
  a_rendimento: boolean;
  valor_venda_previsto: number | null;
  valor_venda_definitivo: number | null;
  venda_paga: boolean;
  venda_data_pagamento: string | null;
  venda_entregue: boolean;
  venda_data_entrega: string | null;
  venda_contrato_assinado: boolean;
  venda_data_contrato_assinado: string | null;
  venda_posse_transferida: boolean;
  venda_data_posse_transferida: string | null;
};

export type Venda = {
  id: string;
  data: string;
  descricao: string | null;
  comprador: string | null;
  prazo_recebimento: string | null;
  recebido: boolean;
  responsavel: string | null;
  observacoes: string | null;
  criado_em: string;
  cobranca_grupo_id: string | null;
  animais: AnimalDaVenda[];
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null }) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

async function buscarAnimaisAtivos(supabase: ClienteServidor, localId: string) {
  const TAMANHO_PAGINA = 1000;
  const todos: Record<string, unknown>[] = [];
  let pagina = 0;

  while (true) {
    const { data, error } = await supabase
      .from("animais")
      .select(
        `id, nome, brinco, tatuagem, especie, sexo, grau_sangue,
         areas(nome), categorias!categoria_id(descricao), racas(descricao)`,
      )
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo")
      .order("criado_em", { ascending: false })
      .range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);

    if (error) throw new Error(error.message);
    todos.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    pagina++;
  }

  return todos;
}

export default async function VendasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [animaisAtivosRaw, { data: vendasRaw, error: erroVendas }] = await Promise.all([
    buscarAnimaisAtivos(supabase, localId),
    supabase
      .from("vendas")
      .select(
        "id, data, descricao, comprador, prazo_recebimento, recebido, responsavel, observacoes, criado_em, cobranca_grupo_id",
      )
      .eq("local_id", localId)
      .order("criado_em", { ascending: false }),
  ]);

  if (erroVendas) {
    throw new Error("Não foi possível carregar as vendas: " + erroVendas.message);
  }

  const animaisAtivos: AnimalParaVenda[] = animaisAtivosRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as AnimalParaVenda[];

  const idsVendas = (vendasRaw ?? []).map((v) => v.id);
  const { data: animaisVendidosRaw, error: erroAnimaisVendidos } = idsVendas.length
    ? await supabase
        .from("animais")
        .select(
          `id, nome, brinco, tatuagem, venda_id, peso_venda, a_rendimento, valor_venda_previsto, valor_venda_definitivo,
           venda_paga, venda_data_pagamento, venda_entregue, venda_data_entrega,
           venda_contrato_assinado, venda_data_contrato_assinado, venda_posse_transferida, venda_data_posse_transferida,
           categorias!categoria_id(descricao)`,
        )
        .in("venda_id", idsVendas)
    : { data: [] as Record<string, unknown>[], error: null };

  if (erroAnimaisVendidos) {
    throw new Error("Não foi possível carregar as vendas: " + erroAnimaisVendidos.message);
  }

  const animaisPorVenda = new Map<string, AnimalDaVenda[]>();
  for (const a of animaisVendidosRaw ?? []) {
    const lista = animaisPorVenda.get(a.venda_id as string) ?? [];
    lista.push({
      id: a.id as string,
      identificacao: identificacao(a as { nome: string | null; brinco: string | null; tatuagem: string | null }),
      categoria_descricao:
        primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
      peso_venda: a.peso_venda as number | null,
      a_rendimento: a.a_rendimento as boolean,
      valor_venda_previsto: a.valor_venda_previsto as number | null,
      valor_venda_definitivo: a.valor_venda_definitivo as number | null,
      venda_paga: a.venda_paga as boolean,
      venda_data_pagamento: a.venda_data_pagamento as string | null,
      venda_entregue: a.venda_entregue as boolean,
      venda_data_entrega: a.venda_data_entrega as string | null,
      venda_contrato_assinado: a.venda_contrato_assinado as boolean,
      venda_data_contrato_assinado: a.venda_data_contrato_assinado as string | null,
      venda_posse_transferida: a.venda_posse_transferida as boolean,
      venda_data_posse_transferida: a.venda_data_posse_transferida as string | null,
    });
    animaisPorVenda.set(a.venda_id as string, lista);
  }

  const vendas: Venda[] = (vendasRaw ?? []).map((v) => ({
    id: v.id,
    data: v.data,
    descricao: v.descricao,
    comprador: v.comprador,
    prazo_recebimento: v.prazo_recebimento,
    recebido: v.recebido,
    responsavel: v.responsavel,
    observacoes: v.observacoes,
    criado_em: v.criado_em,
    cobranca_grupo_id: v.cobranca_grupo_id,
    animais: animaisPorVenda.get(v.id) ?? [],
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <HistoricoVendas localId={localId} vendas={vendas} podeEditar={podeEditar} />
      <TabelaAnimaisVenda localId={localId} animais={animaisAtivos} podeEditar={podeEditar} />
    </div>
  );
}
