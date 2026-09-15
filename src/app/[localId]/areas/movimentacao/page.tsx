import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TabelaAnimaisMovimentacao } from "./tabela-animais-movimentacao";
import { HistoricoMovimentacoes } from "./historico-movimentacoes";

export type Especie = "bovino" | "ovino" | "equino";

export type AnimalMovimentacao = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  sexo: string;
  grau_sangue: string;
  area_id: string;
  area_nome: string;
  categoria_descricao: string;
  raca_descricao: string;
};

export type OpcaoArea = { id: string; nome: string };

export type MovimentacaoAnimal = {
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
};

export type GrupoMovimentacao = {
  movimentacao_grupo_id: string;
  data: string;
  responsavel: string | null;
  descricao: string | null;
  criado_em: string;
  area_origem_nome: string | null;
  area_destino_nome: string | null;
  area_destino_id: string;
  animais: MovimentacaoAnimal[];
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
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
        `id, nome, brinco, tatuagem, especie, sexo, grau_sangue, area_id,
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

export default async function MovimentacaoPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [
    animaisAtivosRaw,
    { data: areas, error: erroAreas },
    { data: movimentacoesRaw, error: erroMovimentacoes },
  ] = await Promise.all([
    buscarAnimaisAtivos(supabase, localId),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem"),
    supabase
      .from("movimentacoes")
      .select(
        `movimentacao_grupo_id, data, responsavel, descricao, criado_em, animal_id, area_destino_id,
         origem:areas!area_origem_id(nome),
         destino:areas!area_destino_id(nome),
         animais(nome, brinco, tatuagem)`,
      )
      .eq("local_id", localId)
      .order("criado_em", { ascending: false }),
  ]);

  if (erroAreas || erroMovimentacoes) {
    throw new Error(
      "Não foi possível carregar as movimentações: " + (erroAreas?.message || erroMovimentacoes?.message),
    );
  }

  const animaisAtivos: AnimalMovimentacao[] = animaisAtivosRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as AnimalMovimentacao[];

  const grupos = new Map<string, GrupoMovimentacao>();
  for (const linha of movimentacoesRaw ?? []) {
    const animalInfo = primeiro(
      linha.animais as
        | { nome: string | null; brinco: string | null; tatuagem: string | null }
        | { nome: string | null; brinco: string | null; tatuagem: string | null }[]
        | null,
    );
    const origem = primeiro(linha.origem as { nome: string } | { nome: string }[] | null);
    const destino = primeiro(linha.destino as { nome: string } | { nome: string }[] | null);
    const animalEntry: MovimentacaoAnimal = {
      nome: animalInfo?.nome ?? null,
      brinco: animalInfo?.brinco ?? null,
      tatuagem: animalInfo?.tatuagem ?? null,
    };
    const existente = grupos.get(linha.movimentacao_grupo_id);
    if (existente) {
      existente.animais.push(animalEntry);
    } else {
      grupos.set(linha.movimentacao_grupo_id, {
        movimentacao_grupo_id: linha.movimentacao_grupo_id,
        data: linha.data,
        responsavel: linha.responsavel,
        descricao: linha.descricao,
        criado_em: linha.criado_em,
        area_origem_nome: origem?.nome ?? null,
        area_destino_nome: destino?.nome ?? null,
        area_destino_id: linha.area_destino_id,
        animais: [animalEntry],
      });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <HistoricoMovimentacoes
        localId={localId}
        grupos={Array.from(grupos.values())}
        areas={(areas as OpcaoArea[]) ?? []}
        podeEditar={podeEditar}
      />
      <TabelaAnimaisMovimentacao
        localId={localId}
        animais={animaisAtivos}
        areas={(areas as OpcaoArea[]) ?? []}
        podeEditar={podeEditar}
      />
    </div>
  );
}
