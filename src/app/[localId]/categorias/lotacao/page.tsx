import { buscarLocalAtual } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaLotacaoCategorias } from "./lista-lotacao-categorias";

export type Especie = "bovino" | "ovino" | "equino";

export type AreaLotacao = { area_nome: string; total: number };

export type CategoriaLotacao = {
  id: string;
  descricao: string;
  especie: Especie;
  ordem: number;
  total: number;
  porArea: AreaLotacao[];
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

async function buscarAnimaisResumo(supabase: ClienteServidor, localId: string) {
  const TAMANHO_PAGINA = 1000;
  const todos: Record<string, unknown>[] = [];
  let pagina = 0;

  while (true) {
    const { data, error } = await supabase
      .from("animais")
      .select("categoria_id, area_id, areas(nome)")
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo")
      .range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);

    if (error) throw new Error(error.message);
    todos.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    pagina++;
  }

  return todos;
}

export default async function LotacaoCategoriasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [{ data: categoriasRaw, error: erroCategorias }, animaisRaw] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, descricao, especie, ordem")
      .eq("local_id", localId)
      .eq("ativo", true)
      .order("ordem"),
    buscarAnimaisResumo(supabase, localId),
  ]);

  if (erroCategorias) {
    throw new Error("Não foi possível carregar a lotação por categorias: " + erroCategorias.message);
  }

  const porCategoria = new Map<string, { total: number; areas: Map<string, number> }>();
  for (const a of animaisRaw) {
    const categoriaId = a.categoria_id as string;
    const areaNome =
      primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "Sem área";
    const atual = porCategoria.get(categoriaId) ?? { total: 0, areas: new Map<string, number>() };
    atual.total += 1;
    atual.areas.set(areaNome, (atual.areas.get(areaNome) ?? 0) + 1);
    porCategoria.set(categoriaId, atual);
  }

  const categorias: CategoriaLotacao[] = (categoriasRaw ?? []).map((c) => {
    const resumo = porCategoria.get(c.id);
    const porArea = resumo
      ? Array.from(resumo.areas.entries())
          .map(([area_nome, total]) => ({ area_nome, total }))
          .sort((a, b) => b.total - a.total)
      : [];
    return {
      id: c.id,
      descricao: c.descricao,
      especie: c.especie as Especie,
      ordem: c.ordem,
      total: resumo?.total ?? 0,
      porArea,
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListaLotacaoCategorias localId={localId} categorias={categorias} />
    </div>
  );
}
