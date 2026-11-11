import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";
import { TabelaMortes } from "./tabela-mortes";
import { NovaMorte } from "./nova-morte";

export type Especie = "bovino" | "ovino" | "equino";

// Mesmo formato do card de seleção compartilhado (Nova venda, Nova morte).
export type AnimalAtivo = AnimalSelecionavel;

export type MorteAnimal = {
  animal_id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  categoria_descricao: string;
  area_nome: string | null;
};

export type GrupoMorte = {
  ocorrencia_grupo_id: string;
  data: string;
  especie: Especie;
  enfermidade_id: string | null;
  enfermidade_descricao: string | null;
  tratada: boolean | null;
  responsavel: string | null;
  descricao: string | null;
  observacoes: string | null;
  criado_em: string;
  animais: MorteAnimal[];
};

export type OpcaoEnfermidade = { id: string; descricao: string };

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
        "id, nome, brinco, tatuagem, especie, sexo, grau_sangue, areas(nome), categorias!categoria_id(descricao), racas(descricao)",
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

export default async function MortesPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [animaisAtivosRaw, { data: mortesRaw, error: erroMortes }, { data: enfermidades, error: erroEnfermidades }] =
    await Promise.all([
      buscarAnimaisAtivos(supabase, localId),
      supabase
        .from("ocorrencias_morte")
        .select(
          `ocorrencia_grupo_id, data, especie, enfermidade_id, tratada, responsavel, descricao, observacoes,
           criado_em, animal_id, enfermidades(descricao),
           animais(nome, brinco, tatuagem, categorias!categoria_id(descricao), areas(nome))`,
        )
        .eq("local_id", localId)
        .eq("desfeita", false)
        .order("criado_em", { ascending: false }),
      supabase.from("enfermidades").select("id, descricao").eq("local_id", localId).eq("ativo", true).order("descricao"),
    ]);

  if (erroMortes || erroEnfermidades) {
    throw new Error(
      "Não foi possível carregar os registros de morte: " + (erroMortes?.message || erroEnfermidades?.message),
    );
  }

  const animaisAtivos: AnimalAtivo[] = animaisAtivosRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as AnimalAtivo[];

  const grupos = new Map<string, GrupoMorte>();
  for (const linha of mortesRaw ?? []) {
    type InfoAnimal = {
      nome: string | null;
      brinco: string | null;
      tatuagem: string | null;
      categorias: { descricao: string } | { descricao: string }[] | null;
      areas: { nome: string } | { nome: string }[] | null;
    };
    const animalInfo = primeiro(linha.animais as InfoAnimal | InfoAnimal[] | null);
    const existente = grupos.get(linha.ocorrencia_grupo_id);
    const animalEntry: MorteAnimal = {
      animal_id: linha.animal_id,
      nome: animalInfo?.nome ?? null,
      brinco: animalInfo?.brinco ?? null,
      tatuagem: animalInfo?.tatuagem ?? null,
      categoria_descricao: primeiro(animalInfo?.categorias ?? null)?.descricao ?? "Sem categoria",
      area_nome: primeiro(animalInfo?.areas ?? null)?.nome ?? null,
    };
    if (existente) {
      existente.animais.push(animalEntry);
    } else {
      grupos.set(linha.ocorrencia_grupo_id, {
        ocorrencia_grupo_id: linha.ocorrencia_grupo_id,
        data: linha.data,
        especie: linha.especie,
        enfermidade_id: linha.enfermidade_id,
        enfermidade_descricao:
          primeiro(linha.enfermidades as { descricao: string } | { descricao: string }[] | null)?.descricao ?? null,
        tratada: linha.tratada,
        responsavel: linha.responsavel,
        descricao: linha.descricao,
        observacoes: linha.observacoes,
        criado_em: linha.criado_em,
        animais: [animalEntry],
      });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <TabelaMortes
        localId={localId}
        localNome={local.nome}
        grupos={Array.from(grupos.values())}
        enfermidades={(enfermidades as OpcaoEnfermidade[]) ?? []}
        podeEditar={podeEditar}
      />
      {podeEditar && (
        <NovaMorte
          localId={localId}
          animais={animaisAtivos}
          enfermidades={(enfermidades as OpcaoEnfermidade[]) ?? []}
        />
      )}
    </div>
  );
}
