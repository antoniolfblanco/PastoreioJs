import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TabelaFurtos } from "./tabela-furtos";

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

export type FurtoAnimal = {
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
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

export default async function FurtosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [animaisAtivosRaw, { data: furtosRaw, error: erroFurtos }] = await Promise.all([
    buscarAnimaisAtivos(supabase, localId),
    supabase
      .from("roubos_furtos")
      .select(
        `id, data, especie, ocorrencia, responsavel, descricao, observacoes, criado_em,
         animais!furto_id(nome, brinco, tatuagem)`,
      )
      .eq("local_id", localId)
      .order("criado_em", { ascending: false }),
  ]);

  if (erroFurtos) {
    throw new Error("Não foi possível carregar os registros de furto: " + erroFurtos.message);
  }

  const animaisAtivos: AnimalAtivo[] = animaisAtivosRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as AnimalAtivo[];

  const registros: RegistroFurto[] = (furtosRaw ?? []).map((f) => ({
    ...f,
    animais: (Array.isArray(f.animais) ? f.animais : f.animais ? [f.animais] : []) as FurtoAnimal[],
  })) as unknown as RegistroFurto[];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TabelaFurtos localId={localId} registros={registros} animaisAtivos={animaisAtivos} podeEditar={podeEditar} />
    </div>
  );
}
