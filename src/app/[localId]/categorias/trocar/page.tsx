import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";
import { NovaTroca } from "./nova-troca";
import { HistoricoTrocas } from "./historico-trocas";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";

// Mesmo formato do card de seleção compartilhado, mais a categoria atual
// (pra avisar quando o destino é a mesma).
export type AnimalTroca = AnimalSelecionavel & { categoria_id: string };

export type OpcaoCategoria = { id: string; descricao: string; especie: Especie; sexo: Sexo };

export type TrocaAnimal = {
  animal_id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  categoria_origem_descricao: string | null;
  categoria_destino_descricao: string | null;
  especie: Especie | null;
  area_nome: string | null;
};

export type GrupoTroca = {
  troca_grupo_id: string;
  data: string;
  responsavel: string | null;
  descricao: string | null;
  criado_em: string;
  animais: TrocaAnimal[];
};

export type CicloAtivo = { nome: string; data_inicio: string; data_fim: string | null } | null;

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
        `id, nome, brinco, tatuagem, especie, sexo, grau_sangue, categoria_id,
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

export default async function TrocarCategoriaPage({
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
    { data: categorias, error: erroCategorias },
    { data: trocasRaw, error: erroTrocas },
    { data: ciclo },
  ] = await Promise.all([
    buscarAnimaisAtivos(supabase, localId),
    supabase
      .from("categorias")
      .select("id, descricao, especie, sexo")
      .eq("local_id", localId)
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("trocas_categoria")
      .select(
        `troca_grupo_id, data, responsavel, descricao, criado_em, animal_id,
         origem:categorias!categoria_origem_id(descricao),
         destino:categorias!categoria_destino_id(descricao),
         animais(nome, brinco, tatuagem, especie, areas(nome))`,
      )
      .eq("local_id", localId)
      .order("criado_em", { ascending: false }),
    supabase.from("ciclos").select("nome, data_inicio, data_fim").eq("local_id", localId).eq("ativo", true).maybeSingle(),
  ]);

  if (erroCategorias || erroTrocas) {
    throw new Error(
      "Não foi possível carregar as trocas de categoria: " + (erroCategorias?.message || erroTrocas?.message),
    );
  }

  const animaisAtivos: AnimalTroca[] = animaisAtivosRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as AnimalTroca[];

  const grupos = new Map<string, GrupoTroca>();
  for (const linha of trocasRaw ?? []) {
    type InfoAnimal = {
      nome: string | null;
      brinco: string | null;
      tatuagem: string | null;
      especie: Especie | null;
      areas: { nome: string } | { nome: string }[] | null;
    };
    const animalInfo = primeiro(linha.animais as InfoAnimal | InfoAnimal[] | null);
    const origem = primeiro(linha.origem as { descricao: string } | { descricao: string }[] | null);
    const destino = primeiro(linha.destino as { descricao: string } | { descricao: string }[] | null);
    const animalEntry: TrocaAnimal = {
      animal_id: linha.animal_id,
      nome: animalInfo?.nome ?? null,
      brinco: animalInfo?.brinco ?? null,
      tatuagem: animalInfo?.tatuagem ?? null,
      categoria_origem_descricao: origem?.descricao ?? null,
      categoria_destino_descricao: destino?.descricao ?? null,
      especie: animalInfo?.especie ?? null,
      area_nome: primeiro(animalInfo?.areas ?? null)?.nome ?? null,
    };
    const existente = grupos.get(linha.troca_grupo_id);
    if (existente) {
      existente.animais.push(animalEntry);
    } else {
      grupos.set(linha.troca_grupo_id, {
        troca_grupo_id: linha.troca_grupo_id,
        data: linha.data,
        responsavel: linha.responsavel,
        descricao: linha.descricao,
        criado_em: linha.criado_em,
        animais: [animalEntry],
      });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <HistoricoTrocas
        localId={localId}
        grupos={Array.from(grupos.values())}
        ciclo={(ciclo as CicloAtivo) ?? null}
        podeEditar={podeEditar}
      />
      {podeEditar && (
        <NovaTroca localId={localId} animais={animaisAtivos} categorias={(categorias as OpcaoCategoria[]) ?? []} />
      )}
    </div>
  );
}
