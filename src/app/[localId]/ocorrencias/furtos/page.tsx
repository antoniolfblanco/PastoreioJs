import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarAnimaisSelecionaveis, buscarCicloAtivo } from "@/lib/animais-selecionaveis";
import { TabelaFurtos } from "./tabela-furtos";
import { NovoFurto } from "./novo-furto";

export type Especie = "bovino" | "ovino" | "equino";

export type FurtoAnimal = {
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  categoria_descricao: string;
  area_nome: string;
};

export type RegistroFurto = {
  id: string;
  data: string;
  especie: Especie;
  ocorrencia: string | null;
  responsavel: string | null;
  descricao: string | null;
  observacoes: string | null;
  criado_em: string;
  animais: FurtoAnimal[];
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

export default async function FurtosPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [animaisAtivos, ciclo, { data: furtosRaw, error: erroFurtos }] = await Promise.all([
    buscarAnimaisSelecionaveis(supabase, localId),
    buscarCicloAtivo(supabase, localId),
    supabase
      .from("roubos_furtos")
      .select(
        `id, data, especie, ocorrencia, responsavel, descricao, observacoes, criado_em,
         animais!furto_id(nome, brinco, tatuagem, categorias!categoria_id(descricao), areas(nome))`,
      )
      .eq("local_id", localId)
      .order("criado_em", { ascending: false }),
  ]);

  if (erroFurtos) {
    throw new Error("Não foi possível carregar os registros de furto: " + erroFurtos.message);
  }

  type InfoAnimal = {
    nome: string | null;
    brinco: string | null;
    tatuagem: string | null;
    categorias: { descricao: string } | { descricao: string }[] | null;
    areas: { nome: string } | { nome: string }[] | null;
  };
  const registros: RegistroFurto[] = (furtosRaw ?? []).map((f) => {
    const lista = (Array.isArray(f.animais) ? f.animais : f.animais ? [f.animais] : []) as InfoAnimal[];
    return {
      id: f.id,
      data: f.data,
      especie: f.especie,
      ocorrencia: f.ocorrencia,
      responsavel: f.responsavel,
      descricao: f.descricao,
      observacoes: f.observacoes,
      criado_em: f.criado_em,
      animais: lista.map((a) => ({
        nome: a.nome,
        brinco: a.brinco,
        tatuagem: a.tatuagem,
        categoria_descricao: primeiro(a.categorias)?.descricao ?? "Sem categoria",
        area_nome: primeiro(a.areas)?.nome ?? "Sem área",
      })),
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <TabelaFurtos localId={localId} registros={registros} ciclo={ciclo} podeEditar={podeEditar} />
      {podeEditar && <NovoFurto localId={localId} animais={animaisAtivos} />}
    </div>
  );
}
