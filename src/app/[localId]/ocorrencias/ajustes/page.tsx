import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TabelaAjustes } from "./tabela-ajustes";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";
export type Tipo = "entrada" | "saida";

export type AnimalAtivo = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  area_nome: string;
  categoria_descricao: string;
};

export type AjusteAnimal = {
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
};

export type GrupoAjuste = {
  ocorrencia_grupo_id: string;
  tipo: Tipo;
  data: string;
  especie: Especie;
  responsavel: string | null;
  descricao: string | null;
  observacoes: string | null;
  criado_em: string;
  animais: AjusteAnimal[];
};

export type OpcaoArea = { id: string; nome: string };
export type OpcaoCategoria = { id: string; descricao: string; especie: Especie; sexo: Sexo };
export type OpcaoRaca = { id: string; descricao: string; padrao: boolean };

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
      .select("id, nome, brinco, tatuagem, especie, areas(nome), categorias!categoria_id(descricao)")
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

export default async function AjustesPage({
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
    { data: ajustesRaw, error: erroAjustes },
    { data: areas, error: erroAreas },
    { data: categorias, error: erroCategorias },
    { data: racas, error: erroRacas },
  ] = await Promise.all([
    buscarAnimaisAtivos(supabase, localId),
    supabase
      .from("ocorrencias_ajuste")
      .select(
        `ocorrencia_grupo_id, tipo, data, responsavel, descricao, observacoes, criado_em, animal_id,
         animais(nome, brinco, tatuagem, especie)`,
      )
      .eq("local_id", localId)
      .eq("desfeita", false)
      .order("criado_em", { ascending: false }),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem"),
    supabase
      .from("categorias")
      .select("id, descricao, especie, sexo")
      .eq("local_id", localId)
      .eq("ativo", true)
      .order("ordem"),
    supabase.from("racas").select("id, descricao, padrao").eq("local_id", localId).eq("ativo", true).order("descricao"),
  ]);

  if (erroAjustes || erroAreas || erroCategorias || erroRacas) {
    throw new Error(
      "Não foi possível carregar os acertos de contagem: " +
        (erroAjustes?.message || erroAreas?.message || erroCategorias?.message || erroRacas?.message),
    );
  }

  const animaisAtivos: AnimalAtivo[] = animaisAtivosRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as AnimalAtivo[];

  const grupos = new Map<string, GrupoAjuste>();
  for (const linha of ajustesRaw ?? []) {
    const animalInfo = primeiro(linha.animais as AjusteAnimal | AjusteAnimal[] | null);
    const animalEntry: AjusteAnimal = {
      nome: animalInfo?.nome ?? null,
      brinco: animalInfo?.brinco ?? null,
      tatuagem: animalInfo?.tatuagem ?? null,
      especie: animalInfo?.especie ?? "bovino",
    };
    const existente = grupos.get(linha.ocorrencia_grupo_id);
    if (existente) {
      existente.animais.push(animalEntry);
    } else {
      grupos.set(linha.ocorrencia_grupo_id, {
        ocorrencia_grupo_id: linha.ocorrencia_grupo_id,
        tipo: linha.tipo,
        data: linha.data,
        especie: animalEntry.especie,
        responsavel: linha.responsavel,
        descricao: linha.descricao,
        observacoes: linha.observacoes,
        criado_em: linha.criado_em,
        animais: [animalEntry],
      });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TabelaAjustes
        localId={localId}
        grupos={Array.from(grupos.values())}
        animaisAtivos={animaisAtivos}
        areas={(areas as OpcaoArea[]) ?? []}
        categorias={(categorias as OpcaoCategoria[]) ?? []}
        racas={(racas as OpcaoRaca[]) ?? []}
        podeEditar={podeEditar}
      />
    </div>
  );
}
