import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TabelaConsumo } from "./tabela-consumo";

export type Especie = "bovino" | "ovino" | "equino";

export type AnimalAtivo = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  area_nome: string;
  categoria_descricao: string;
};

export type ConsumoAnimal = {
  animal_id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
};

export type GrupoConsumo = {
  ocorrencia_grupo_id: string;
  data: string;
  especie: Especie;
  peso_vivo: number | null;
  peso_carne: number | null;
  destino: string | null;
  responsavel: string | null;
  descricao: string | null;
  observacoes: string | null;
  criado_em: string;
  animais: ConsumoAnimal[];
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

export default async function ConsumoPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [animaisAtivosRaw, { data: consumosRaw, error: erroConsumos }] = await Promise.all([
    buscarAnimaisAtivos(supabase, localId),
    supabase
      .from("ocorrencias_consumo")
      .select(
        `ocorrencia_grupo_id, data, especie, peso_vivo, peso_carne, destino, responsavel, descricao,
         observacoes, criado_em, animal_id, animais(nome, brinco, tatuagem)`,
      )
      .eq("local_id", localId)
      .eq("desfeita", false)
      .order("criado_em", { ascending: false }),
  ]);

  if (erroConsumos) {
    throw new Error("Não foi possível carregar os registros de consumo: " + erroConsumos.message);
  }

  const animaisAtivos: AnimalAtivo[] = animaisAtivosRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as AnimalAtivo[];

  const grupos = new Map<string, GrupoConsumo>();
  for (const linha of consumosRaw ?? []) {
    const animalInfo = primeiro(linha.animais as ConsumoAnimal | ConsumoAnimal[] | null);
    const existente = grupos.get(linha.ocorrencia_grupo_id);
    const animalEntry: ConsumoAnimal = {
      animal_id: linha.animal_id,
      nome: animalInfo?.nome ?? null,
      brinco: animalInfo?.brinco ?? null,
      tatuagem: animalInfo?.tatuagem ?? null,
    };
    if (existente) {
      existente.animais.push(animalEntry);
    } else {
      grupos.set(linha.ocorrencia_grupo_id, {
        ocorrencia_grupo_id: linha.ocorrencia_grupo_id,
        data: linha.data,
        especie: linha.especie,
        peso_vivo: linha.peso_vivo,
        peso_carne: linha.peso_carne,
        destino: linha.destino,
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
      <TabelaConsumo
        localId={localId}
        grupos={Array.from(grupos.values())}
        animaisAtivos={animaisAtivos}
        podeEditar={podeEditar}
      />
    </div>
  );
}
