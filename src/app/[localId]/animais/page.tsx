import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TabelaAnimais } from "./tabela-animais";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";

export type Animal = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  data_nascimento: string | null;
  sexo: Sexo;
  especie: Especie;
  area_id: string;
  categoria_id: string;
  raca_id: string;
  grau_sangue: string;
  registro_provisorio: string | null;
  registro_definitivo: string | null;
  observacoes: string | null;
  pai_id: string | null;
  mae_id: string | null;
  receptora_id: string | null;
  castrado: boolean;
  valor: number | null;
  area_nome: string;
  categoria_descricao: string;
  raca_descricao: string;
};

export type OpcaoArea = { id: string; nome: string };
export type OpcaoCategoria = { id: string; descricao: string; especie: Especie; sexo: Sexo };
export type OpcaoRaca = { id: string; descricao: string; padrao: boolean };
export type CategoriaIvz = { id: string; nome: string; especie: Especie; sexo: Sexo };

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

const SELECAO_ANIMAL = `id, nome, brinco, tatuagem, data_nascimento, sexo, especie, area_id, categoria_id, raca_id,
  grau_sangue, registro_provisorio, registro_definitivo, observacoes, pai_id, mae_id, receptora_id,
  castrado, valor,
  areas(nome), categorias!categoria_id(descricao), racas(descricao)`;
// `categorias!categoria_id` desambigua o embed: `animais` tem DUAS FKs pra
// `categorias` (a categoria atual e `categoria_estoque_inicial_id`, usada só
// internamente pelo saldo inicial do ciclo) — sem apontar qual usar, o
// PostgREST recusa o embed inteiro com erro, e a query falha por completo.

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

// A API do Supabase tem um teto de linhas por resposta (bem menor que o
// rebanho de uma fazenda grande) — sem paginar, um local com mais de mil
// cabeças perderia o resto em silêncio. Pagina em blocos até não sobrar mais
// nada pra buscar.
async function buscarTodosAnimais(supabase: ClienteServidor, localId: string) {
  const TAMANHO_PAGINA = 1000;
  const todos: Record<string, unknown>[] = [];
  let pagina = 0;

  while (true) {
    const { data, error } = await supabase
      .from("animais")
      .select(SELECAO_ANIMAL)
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

export default async function AnimaisPage({
  params,
  searchParams,
}: {
  params: Promise<{ localId: string }>;
  searchParams: Promise<{ especie?: string; area?: string; categoria?: string }>;
}) {
  const { localId } = await params;
  const { especie, area, categoria } = await searchParams;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [
    animaisRaw,
    { data: areas, error: erroAreas },
    { data: categorias, error: erroCategorias },
    { data: racas, error: erroRacas },
    { data: categoriasIvz, error: erroCategoriasIvz },
    { data: ciclo },
  ] = await Promise.all([
    buscarTodosAnimais(supabase, localId),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem"),
    supabase
      .from("categorias")
      .select("id, descricao, especie, sexo")
      .eq("local_id", localId)
      .eq("ativo", true)
      .order("ordem"),
    supabase.from("racas").select("id, descricao, padrao").eq("local_id", localId).eq("ativo", true).order("descricao"),
    supabase.from("categorias_ivz").select("id, nome, especie, sexo").eq("ativo", true).order("ordem"),
    supabase.from("ciclos").select("id, nome").eq("local_id", localId).eq("ativo", true).maybeSingle(),
  ]);

  if (erroAreas || erroCategorias || erroRacas || erroCategoriasIvz) {
    throw new Error(
      "Não foi possível carregar os dados de animais: " +
        (erroAreas?.message || erroCategorias?.message || erroRacas?.message || erroCategoriasIvz?.message),
    );
  }

  const animais = animaisRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as Animal[];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TabelaAnimais
        localId={localId}
        animais={animais}
        areas={(areas as OpcaoArea[]) ?? []}
        categorias={(categorias as OpcaoCategoria[]) ?? []}
        racas={(racas as OpcaoRaca[]) ?? []}
        categoriasIvz={(categoriasIvz as CategoriaIvz[]) ?? []}
        cicloAtivoNome={ciclo?.nome ?? null}
        podeEditar={podeGerenciarConteudo(local.perfil)}
        especieInicial={especie as Especie | undefined}
        areaInicialId={area}
        categoriaInicialId={categoria}
      />
    </div>
  );
}
