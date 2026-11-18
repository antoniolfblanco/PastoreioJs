import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarAnimaisSelecionaveis, buscarCicloAtivo } from "@/lib/animais-selecionaveis";
import { TabelaConsumo } from "./tabela-consumo";
import { NovoConsumo } from "./novo-consumo";

export type Especie = "bovino" | "ovino" | "equino";

export type ConsumoAnimal = {
  area_nome: string | null;
  animal_id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  categoria_descricao: string;
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

export default async function ConsumoPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [animaisAtivos, ciclo, { data: consumosRaw, error: erroConsumos }] = await Promise.all([
    buscarAnimaisSelecionaveis(supabase, localId),
    buscarCicloAtivo(supabase, localId),
    supabase
      .from("ocorrencias_consumo")
      .select(
        `ocorrencia_grupo_id, data, especie, peso_vivo, peso_carne, destino, responsavel, descricao,
         observacoes, criado_em, animal_id, animais(nome, brinco, tatuagem, categorias!categoria_id(descricao), areas(nome))`,
      )
      .eq("local_id", localId)
      .eq("desfeita", false)
      .order("criado_em", { ascending: false }),
  ]);

  if (erroConsumos) {
    throw new Error("Não foi possível carregar os registros de consumo: " + erroConsumos.message);
  }

  type InfoAnimal = {
    nome: string | null;
    brinco: string | null;
    tatuagem: string | null;
    categorias: { descricao: string } | { descricao: string }[] | null;
    areas: { nome: string } | { nome: string }[] | null;
  };
  const grupos = new Map<string, GrupoConsumo>();
  for (const linha of consumosRaw ?? []) {
    const info = primeiro(linha.animais as InfoAnimal | InfoAnimal[] | null);
    const animal: ConsumoAnimal = {
      animal_id: linha.animal_id,
      nome: info?.nome ?? null,
      brinco: info?.brinco ?? null,
      tatuagem: info?.tatuagem ?? null,
      categoria_descricao: primeiro(info?.categorias ?? null)?.descricao ?? "Sem categoria",
      area_nome: primeiro(info?.areas ?? null)?.nome ?? null,
    };
    const existente = grupos.get(linha.ocorrencia_grupo_id);
    if (existente) existente.animais.push(animal);
    else
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
        animais: [animal],
      });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <TabelaConsumo localId={localId} grupos={Array.from(grupos.values())} ciclo={ciclo} podeEditar={podeEditar} />
      {podeEditar && <NovoConsumo localId={localId} animais={animaisAtivos} />}
    </div>
  );
}
