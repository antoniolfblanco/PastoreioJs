import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { CandidatoGenealogia } from "../reproducao/externos/page";
import { HistoricoNascimentos } from "./historico-nascimentos";
import { NovoNascimento } from "./novo-nascimento";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";

// Um animal registrado como nascimento (origem_entrada = nascimento), em
// qualquer situação — o histórico mostra também os que já saíram do rebanho.
export type Nascido = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  sexo: Sexo;
  data_nascimento: string | null;
  criado_em: string;
  situacao: string;
  area_id: string;
  area_nome: string;
  categoria_descricao: string;
  raca_descricao: string;
  peso_nascimento: number | null;
  mae: string | null;
  pai: string | null;
  receptora: string | null;
};

// Animal ativo só pro resumo por categoria da área escolhida.
export type AtivoResumo = { area_id: string; especie: Especie; categoria_descricao: string };

export type OpcaoArea = { id: string; nome: string };
export type CategoriaNascimento = { id: string; descricao: string; especie: Especie; sexo: Sexo };
export type CicloAtivo = { nome: string; data_inicio: string; data_fim: string | null } | null;

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null } | null) {
  if (!a) return null;
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

// A API tem teto de linhas por resposta — pagina até acabar.
async function paginar(consulta: (de: number, ate: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const TAMANHO_PAGINA = 1000;
  const todos: Record<string, unknown>[] = [];
  for (let pagina = 0; ; pagina++) {
    const { data, error } = await consulta(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);
    if (error) throw new Error(error.message);
    todos.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }
  return todos;
}

async function buscarNascidos(supabase: ClienteServidor, localId: string): Promise<Nascido[]> {
  type Ref = { nome: string | null; brinco: string | null; tatuagem: string | null };
  const linhas = await paginar((de, ate) =>
    supabase
      .from("animais")
      .select(
        `id, nome, brinco, tatuagem, especie, sexo, data_nascimento, criado_em, situacao, area_id, peso_nascimento,
         areas(nome), categorias!categoria_id(descricao), racas(descricao),
         mae:animais!mae_id(nome, brinco, tatuagem),
         pai:animais!pai_id(nome, brinco, tatuagem),
         receptora:animais!receptora_id(nome, brinco, tatuagem)`,
      )
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("origem_entrada", "nascimento")
      .order("criado_em", { ascending: false })
      .range(de, ate),
  );

  return linhas.map((a) => ({
    id: a.id as string,
    nome: a.nome as string | null,
    brinco: a.brinco as string | null,
    tatuagem: a.tatuagem as string | null,
    especie: a.especie as Especie,
    sexo: a.sexo as Sexo,
    data_nascimento: a.data_nascimento as string | null,
    criado_em: a.criado_em as string,
    situacao: a.situacao as string,
    area_id: a.area_id as string,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    peso_nascimento: a.peso_nascimento == null ? null : Number(a.peso_nascimento),
    mae: identificacao(primeiro(a.mae as Ref | Ref[] | null)),
    pai: identificacao(primeiro(a.pai as Ref | Ref[] | null)),
    receptora: identificacao(primeiro(a.receptora as Ref | Ref[] | null)),
  }));
}

async function buscarAtivos(supabase: ClienteServidor, localId: string): Promise<AtivoResumo[]> {
  const linhas = await paginar((de, ate) =>
    supabase
      .from("animais")
      .select("area_id, especie, categorias!categoria_id(descricao)")
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo")
      .range(de, ate),
  );
  return linhas.map((a) => ({
    area_id: a.area_id as string,
    especie: a.especie as Especie,
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  }));
}

// Pai/mãe/receptora: próprios ativos + externos (touros de sêmen, doadoras).
async function buscarCandidatos(supabase: ClienteServidor, localId: string): Promise<CandidatoGenealogia[]> {
  const [proprios, externos] = await Promise.all([
    paginar((de, ate) =>
      supabase
        .from("animais")
        .select("id, nome, brinco, tatuagem, sexo, especie, castrado, racas(descricao)")
        .eq("local_id", localId)
        .eq("origem_registro", "proprio")
        .eq("situacao", "ativo")
        .range(de, ate),
    ),
    paginar((de, ate) =>
      supabase
        .from("animais")
        .select("id, nome, brinco, tatuagem, sexo, especie, racas(descricao)")
        .eq("local_id", localId)
        .eq("origem_registro", "externo")
        .range(de, ate),
    ),
  ]);
  const montar = (a: Record<string, unknown>, externo: boolean): CandidatoGenealogia => ({
    id: a.id as string,
    nome: a.nome as string | null,
    brinco: a.brinco as string | null,
    tatuagem: a.tatuagem as string | null,
    sexo: a.sexo as Sexo,
    especie: a.especie as Especie,
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    castrado: externo ? false : (a.castrado as boolean),
    externo,
  });
  return [...proprios.map((a) => montar(a, false)), ...externos.map((a) => montar(a, true))];
}

export default async function NascimentosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [
    nascidos,
    ativos,
    candidatos,
    { data: areas, error: erroAreas },
    { data: categoriasRaw, error: erroCategorias },
    { data: racas, error: erroRacas },
    { data: ciclo },
  ] = await Promise.all([
    buscarNascidos(supabase, localId),
    buscarAtivos(supabase, localId),
    buscarCandidatos(supabase, localId),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem").order("nome"),
    // Só categorias cuja categoria IVZ é válida pra nascimento (mesmo filtro do app).
    supabase
      .from("categorias")
      .select("id, descricao, especie, sexo, categorias_ivz!inner(valido_para_nascimento)")
      .eq("local_id", localId)
      .eq("ativo", true)
      .eq("categorias_ivz.valido_para_nascimento", true)
      .order("ordem"),
    supabase.from("racas").select("id, descricao, padrao").eq("local_id", localId).eq("ativo", true).order("descricao"),
    supabase.from("ciclos").select("nome, data_inicio, data_fim").eq("local_id", localId).eq("ativo", true).maybeSingle(),
  ]);

  if (erroAreas || erroCategorias || erroRacas) {
    throw new Error(
      "Não foi possível carregar os nascimentos: " +
        (erroAreas?.message || erroCategorias?.message || erroRacas?.message),
    );
  }

  const categorias: CategoriaNascimento[] = (categoriasRaw ?? []).map((c) => ({
    id: c.id,
    descricao: c.descricao,
    especie: c.especie as Especie,
    sexo: c.sexo as Sexo,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <HistoricoNascimentos nascidos={nascidos} areas={(areas as OpcaoArea[]) ?? []} ciclo={(ciclo as CicloAtivo) ?? null} />
      {podeEditar && (
        <NovoNascimento
          localId={localId}
          areas={(areas as OpcaoArea[]) ?? []}
          categorias={categorias}
          racas={racas ?? []}
          candidatos={candidatos}
          nascidos={nascidos}
          ativos={ativos}
          ciclo={(ciclo as CicloAtivo) ?? null}
        />
      )}
    </div>
  );
}
