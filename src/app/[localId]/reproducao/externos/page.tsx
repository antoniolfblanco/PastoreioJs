import { buscarLocalAtual, ehGerente } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaExternos } from "./lista-externos";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";

export type Externo = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  data_nascimento: string | null;
  sexo: Sexo;
  especie: Especie;
  categoria_id: string;
  categoria_descricao: string;
  raca_id: string;
  raca_descricao: string;
  grau_sangue: string;
  registro_provisorio: string | null;
  registro_definitivo: string | null;
  observacoes: string | null;
  pai_id: string | null;
  pai_identificacao: string | null;
  mae_id: string | null;
  mae_identificacao: string | null;
};

export type OpcaoCategoria = { id: string; descricao: string; especie: Especie; sexo: Sexo };
export type OpcaoRaca = { id: string; descricao: string; padrao: boolean };
export type CategoriaIvz = { id: string; nome: string; especie: Especie; sexo: Sexo };

// Pool de candidatos a pai/mãe: inclui tanto animais próprios ativos quanto
// outros externos (um ancestral comprado pode, ele mesmo, ter pai/mãe
// registrados só pra genealogia).
export type CandidatoGenealogia = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  sexo: Sexo;
  especie: Especie;
  raca_descricao: string;
  castrado: boolean;
  externo: boolean;
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null } | null) {
  if (!a) return null;
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || null;
}

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

async function buscarCandidatos(supabase: ClienteServidor, localId: string) {
  const [{ data: proprios, error: erroProprios }, { data: externos, error: erroExternos }] = await Promise.all([
    supabase
      .from("animais")
      .select("id, nome, brinco, tatuagem, sexo, especie, castrado, racas(descricao)")
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo"),
    supabase
      .from("animais")
      .select("id, nome, brinco, tatuagem, sexo, especie, racas(descricao)")
      .eq("local_id", localId)
      .eq("origem_registro", "externo"),
  ]);

  if (erroProprios || erroExternos) {
    throw new Error("Não foi possível carregar os candidatos a pai/mãe: " + (erroProprios?.message || erroExternos?.message));
  }

  const candidatos: CandidatoGenealogia[] = [
    ...(proprios ?? []).map((a) => ({
      id: a.id,
      nome: a.nome,
      brinco: a.brinco,
      tatuagem: a.tatuagem,
      sexo: a.sexo as Sexo,
      especie: a.especie as Especie,
      raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
      castrado: a.castrado,
      externo: false,
    })),
    ...(externos ?? []).map((a) => ({
      id: a.id,
      nome: a.nome,
      brinco: a.brinco,
      tatuagem: a.tatuagem,
      sexo: a.sexo as Sexo,
      especie: a.especie as Especie,
      raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
      castrado: false,
      externo: true,
    })),
  ];

  return candidatos;
}

export default async function ExternosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [
    { data: externosRaw, error: erroExternos },
    { data: categorias, error: erroCategorias },
    { data: racas, error: erroRacas },
    { data: categoriasIvz, error: erroCategoriasIvz },
    candidatos,
  ] = await Promise.all([
    supabase
      .from("animais")
      .select(
        `id, nome, brinco, tatuagem, data_nascimento, sexo, especie, categoria_id, raca_id,
         grau_sangue, registro_provisorio, registro_definitivo, observacoes, pai_id, mae_id,
         categorias!categoria_id(descricao), racas(descricao),
         pai:animais!pai_id(nome, brinco, tatuagem), mae:animais!mae_id(nome, brinco, tatuagem)`,
      )
      .eq("local_id", localId)
      .eq("origem_registro", "externo")
      .order("criado_em", { ascending: false }),
    supabase.from("categorias").select("id, descricao, especie, sexo").eq("local_id", localId).eq("ativo", true).order("ordem"),
    supabase.from("racas").select("id, descricao, padrao").eq("local_id", localId).eq("ativo", true).order("descricao"),
    supabase.from("categorias_ivz").select("id, nome, especie, sexo").eq("ativo", true).order("ordem"),
    buscarCandidatos(supabase, localId),
  ]);

  if (erroExternos || erroCategorias || erroRacas || erroCategoriasIvz) {
    throw new Error(
      "Não foi possível carregar os animais externos: " +
        (erroExternos?.message || erroCategorias?.message || erroRacas?.message || erroCategoriasIvz?.message),
    );
  }

  const externos: Externo[] = (externosRaw ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    brinco: a.brinco,
    tatuagem: a.tatuagem,
    data_nascimento: a.data_nascimento,
    sexo: a.sexo as Sexo,
    especie: a.especie as Especie,
    categoria_id: a.categoria_id,
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_id: a.raca_id,
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    grau_sangue: a.grau_sangue,
    registro_provisorio: a.registro_provisorio,
    registro_definitivo: a.registro_definitivo,
    observacoes: a.observacoes,
    pai_id: a.pai_id,
    pai_identificacao: identificacao(
      primeiro(a.pai as { nome: string | null; brinco: string | null; tatuagem: string | null } | { nome: string | null; brinco: string | null; tatuagem: string | null }[] | null),
    ),
    mae_id: a.mae_id,
    mae_identificacao: identificacao(
      primeiro(a.mae as { nome: string | null; brinco: string | null; tatuagem: string | null } | { nome: string | null; brinco: string | null; tatuagem: string | null }[] | null),
    ),
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListaExternos
        localId={localId}
        externos={externos}
        categorias={(categorias as OpcaoCategoria[]) ?? []}
        racas={(racas as OpcaoRaca[]) ?? []}
        categoriasIvz={(categoriasIvz as CategoriaIvz[]) ?? []}
        candidatos={candidatos}
        podeEditar={ehGerente(local.perfil)}
      />
    </div>
  );
}
