import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PainelAreas } from "./painel-areas";

export type Especie = "bovino" | "ovino" | "equino";

export type Area = {
  id: string;
  nome: string;
  tipo: string | null;
  tamanho: number | null;
  ordem: number;
  observacoes: string | null;
};

export type AnimalResumo = {
  especie: Especie;
  area_id: string;
  categoria_id: string;
  categoria_descricao: string;
  origem_entrada: string | null;
  data_nascimento: string | null;
};

export type MorteResumo = {
  especie: Especie;
  data: string;
  area_id: string | null;
};

export type MovimentacaoResumo = {
  movimentacao_grupo_id: string;
  data: string;
  criado_em: string;
  especie: Especie;
  area_origem_id: string | null;
  area_origem_nome: string | null;
  area_destino_id: string | null;
  area_destino_nome: string | null;
  quantidade: number;
};

export type ManejoResumo = {
  id: string;
  data: string;
  especie: Especie;
  area_id: string;
  descricao: string | null;
  quantidade: number;
};

export type CicloAtivo = { data_inicio: string; data_fim: string | null } | null;

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

async function buscarAnimaisResumo(supabase: ClienteServidor, localId: string) {
  const TAMANHO_PAGINA = 1000;
  const todos: Record<string, unknown>[] = [];
  let pagina = 0;

  while (true) {
    const { data, error } = await supabase
      .from("animais")
      .select("especie, area_id, categoria_id, categorias!categoria_id(descricao), origem_entrada, data_nascimento")
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo")
      .range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);

    if (error) throw new Error(error.message);
    todos.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    pagina++;
  }

  return todos;
}

export default async function PainelAreasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [
    animaisRaw,
    { data: areas, error: erroAreas },
    { data: ciclo },
    { data: mortesRaw, error: erroMortes },
    { data: movimentacoesRaw, error: erroMovimentacoes },
    { data: manejosRaw, error: erroManejos },
  ] = await Promise.all([
    buscarAnimaisResumo(supabase, localId),
    supabase.from("areas").select("id, nome, tipo, tamanho, ordem, observacoes").eq("local_id", localId).eq("ativo", true).order("ordem").order("nome"),
    supabase.from("ciclos").select("data_inicio, data_fim").eq("local_id", localId).eq("ativo", true).maybeSingle(),
    supabase
      .from("ocorrencias_morte")
      .select("especie, data, animais(area_id)")
      .eq("local_id", localId)
      .eq("desfeita", false),
    supabase
      .from("movimentacoes")
      .select(
        `movimentacao_grupo_id, data, criado_em,
         animais(especie),
         origem:areas!area_origem_id(id, nome),
         destino:areas!area_destino_id(id, nome)`,
      )
      .eq("local_id", localId)
      .order("criado_em", { ascending: false })
      .limit(500),
    supabase
      .from("manejos_sanitarios")
      .select("id, data, especie, area_id, descricao")
      .eq("local_id", localId)
      .order("criado_em", { ascending: false })
      .limit(500),
  ]);

  if (erroAreas || erroMortes || erroMovimentacoes || erroManejos) {
    throw new Error(
      "Não foi possível carregar o painel de áreas: " +
        (erroAreas?.message || erroMortes?.message || erroMovimentacoes?.message || erroManejos?.message),
    );
  }

  const idsManejos = (manejosRaw ?? []).map((m) => m.id);
  const { data: manejosAnimaisRaw, error: erroManejosAnimais } = idsManejos.length
    ? await supabase.from("manejos_sanitarios_animais").select("manejo_id").in("manejo_id", idsManejos)
    : { data: [] as { manejo_id: string }[], error: null };

  if (erroManejosAnimais) {
    throw new Error("Não foi possível carregar o painel de áreas: " + erroManejosAnimais.message);
  }

  const animais: AnimalResumo[] = animaisRaw.map((a) => ({
    especie: a.especie as Especie,
    area_id: a.area_id as string,
    categoria_id: a.categoria_id as string,
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    origem_entrada: a.origem_entrada as string | null,
    data_nascimento: a.data_nascimento as string | null,
  }));

  const mortes: MorteResumo[] = (mortesRaw ?? []).map((m) => ({
    especie: m.especie,
    data: m.data,
    area_id: primeiro(m.animais as { area_id: string } | { area_id: string }[] | null)?.area_id ?? null,
  }));

  const gruposMovimentacao = new Map<string, MovimentacaoResumo>();
  for (const linha of movimentacoesRaw ?? []) {
    const origem = primeiro(linha.origem as { id: string; nome: string } | { id: string; nome: string }[] | null);
    const destino = primeiro(linha.destino as { id: string; nome: string } | { id: string; nome: string }[] | null);
    const animal = primeiro(linha.animais as { especie: Especie } | { especie: Especie }[] | null);
    const existente = gruposMovimentacao.get(linha.movimentacao_grupo_id);
    if (existente) {
      existente.quantidade += 1;
    } else {
      gruposMovimentacao.set(linha.movimentacao_grupo_id, {
        movimentacao_grupo_id: linha.movimentacao_grupo_id,
        data: linha.data,
        criado_em: linha.criado_em,
        especie: animal?.especie ?? "bovino",
        area_origem_id: origem?.id ?? null,
        area_origem_nome: origem?.nome ?? null,
        area_destino_id: destino?.id ?? null,
        area_destino_nome: destino?.nome ?? null,
        quantidade: 1,
      });
    }
  }

  const quantidadePorManejo = new Map<string, number>();
  for (const linha of manejosAnimaisRaw ?? []) {
    quantidadePorManejo.set(linha.manejo_id, (quantidadePorManejo.get(linha.manejo_id) ?? 0) + 1);
  }

  const manejos: ManejoResumo[] = (manejosRaw ?? []).map((m) => ({
    id: m.id,
    data: m.data,
    especie: m.especie as Especie,
    area_id: m.area_id,
    descricao: m.descricao,
    quantidade: quantidadePorManejo.get(m.id) ?? 0,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PainelAreas
        localId={localId}
        areas={(areas as Area[]) ?? []}
        animais={animais}
        mortes={mortes}
        movimentacoes={Array.from(gruposMovimentacao.values())}
        manejos={manejos}
        ciclo={(ciclo as CicloAtivo) ?? null}
        podeEditar={podeEditar}
      />
    </div>
  );
}
