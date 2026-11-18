import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarAnimaisSelecionaveis, buscarCicloAtivo } from "@/lib/animais-selecionaveis";
import { TabelaAjustes } from "./tabela-ajustes";
import { NovaSaidaAjuste } from "./nova-saida-ajuste";
import { NovaEntradaAjuste } from "./nova-entrada-ajuste";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";
export type Tipo = "entrada" | "saida";

export type AjusteAnimal = {
  area_nome: string | null;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  categoria_descricao: string;
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

export default async function AjustesPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [
    animaisAtivos,
    ciclo,
    { data: ajustesRaw, error: erroAjustes },
    { data: areas, error: erroAreas },
    { data: categorias, error: erroCategorias },
    { data: racas, error: erroRacas },
  ] = await Promise.all([
    buscarAnimaisSelecionaveis(supabase, localId),
    buscarCicloAtivo(supabase, localId),
    supabase
      .from("ocorrencias_ajuste")
      .select(
        `ocorrencia_grupo_id, tipo, data, responsavel, descricao, observacoes, criado_em, animal_id,
         animais(nome, brinco, tatuagem, especie, categorias!categoria_id(descricao), areas(nome))`,
      )
      .eq("local_id", localId)
      .eq("desfeita", false)
      .order("criado_em", { ascending: false }),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem").order("nome"),
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

  type InfoAnimal = {
    nome: string | null;
    brinco: string | null;
    tatuagem: string | null;
    especie: Especie;
    categorias: { descricao: string } | { descricao: string }[] | null;
    areas: { nome: string } | { nome: string }[] | null;
  };
  const grupos = new Map<string, GrupoAjuste>();
  for (const linha of ajustesRaw ?? []) {
    const info = primeiro(linha.animais as InfoAnimal | InfoAnimal[] | null);
    const animal: AjusteAnimal = {
      nome: info?.nome ?? null,
      brinco: info?.brinco ?? null,
      tatuagem: info?.tatuagem ?? null,
      especie: info?.especie ?? "bovino",
      categoria_descricao: primeiro(info?.categorias ?? null)?.descricao ?? "Sem categoria",
      area_nome: primeiro(info?.areas ?? null)?.nome ?? null,
    };
    const existente = grupos.get(linha.ocorrencia_grupo_id);
    if (existente) existente.animais.push(animal);
    else
      grupos.set(linha.ocorrencia_grupo_id, {
        ocorrencia_grupo_id: linha.ocorrencia_grupo_id,
        tipo: linha.tipo,
        data: linha.data,
        especie: animal.especie,
        responsavel: linha.responsavel,
        descricao: linha.descricao,
        observacoes: linha.observacoes,
        criado_em: linha.criado_em,
        animais: [animal],
      });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <TabelaAjustes localId={localId} grupos={Array.from(grupos.values())} ciclo={ciclo} podeEditar={podeEditar} />
      {podeEditar && (
        <div className="flex flex-col gap-4">
          <NovaSaidaAjuste localId={localId} animais={animaisAtivos} />
          <NovaEntradaAjuste
            localId={localId}
            areas={(areas as OpcaoArea[]) ?? []}
            categorias={(categorias as OpcaoCategoria[]) ?? []}
            racas={(racas as OpcaoRaca[]) ?? []}
          />
        </div>
      )}
    </div>
  );
}
