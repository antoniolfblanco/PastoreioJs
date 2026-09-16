import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PaginaCompras } from "./pagina-compras";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";

export type AnimalDaCompra = {
  id: string;
  identificacao: string;
  categoria_descricao: string;
  peso_compra: number | null;
  valor_compra: number | null;
};

export type Compra = {
  id: string;
  data: string;
  descricao: string | null;
  fornecedor: string | null;
  prazo_pagamento: string | null;
  pago: boolean;
  responsavel: string | null;
  observacoes: string | null;
  criado_em: string;
  animais: AnimalDaCompra[];
};

export type OpcaoArea = { id: string; nome: string };
export type OpcaoCategoria = { id: string; descricao: string; especie: Especie; sexo: Sexo };
export type OpcaoRaca = { id: string; descricao: string; padrao: boolean };
export type CategoriaIvz = { id: string; nome: string; especie: Especie; sexo: Sexo };

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null }) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

export default async function ComprasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [
    { data: comprasRaw, error: erroCompras },
    { data: areas, error: erroAreas },
    { data: categorias, error: erroCategorias },
    { data: racas, error: erroRacas },
    { data: categoriasIvz, error: erroCategoriasIvz },
  ] = await Promise.all([
    supabase
      .from("compras")
      .select("id, data, descricao, fornecedor, prazo_pagamento, pago, responsavel, observacoes, criado_em")
      .eq("local_id", localId)
      .order("criado_em", { ascending: false }),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem"),
    supabase
      .from("categorias")
      .select("id, descricao, especie, sexo")
      .eq("local_id", localId)
      .eq("ativo", true)
      .order("ordem"),
    supabase.from("racas").select("id, descricao, padrao").eq("local_id", localId).eq("ativo", true).order("descricao"),
    supabase.from("categorias_ivz").select("id, nome, especie, sexo").eq("ativo", true).order("ordem"),
  ]);

  if (erroCompras || erroAreas || erroCategorias || erroRacas || erroCategoriasIvz) {
    throw new Error(
      "Não foi possível carregar as compras: " +
        (erroCompras?.message || erroAreas?.message || erroCategorias?.message || erroRacas?.message || erroCategoriasIvz?.message),
    );
  }

  const idsCompras = (comprasRaw ?? []).map((c) => c.id);
  const { data: animaisRaw, error: erroAnimais } = idsCompras.length
    ? await supabase
        .from("animais")
        .select("id, nome, brinco, tatuagem, compra_id, peso_compra, valor_compra, categorias!categoria_id(descricao)")
        .in("compra_id", idsCompras)
    : { data: [] as Record<string, unknown>[], error: null };

  if (erroAnimais) {
    throw new Error("Não foi possível carregar as compras: " + erroAnimais.message);
  }

  const animaisPorCompra = new Map<string, AnimalDaCompra[]>();
  for (const a of animaisRaw ?? []) {
    const lista = animaisPorCompra.get(a.compra_id as string) ?? [];
    lista.push({
      id: a.id as string,
      identificacao: identificacao(a as { nome: string | null; brinco: string | null; tatuagem: string | null }),
      categoria_descricao:
        primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
      peso_compra: a.peso_compra as number | null,
      valor_compra: a.valor_compra as number | null,
    });
    animaisPorCompra.set(a.compra_id as string, lista);
  }

  const compras: Compra[] = (comprasRaw ?? []).map((c) => ({
    id: c.id,
    data: c.data,
    descricao: c.descricao,
    fornecedor: c.fornecedor,
    prazo_pagamento: c.prazo_pagamento,
    pago: c.pago,
    responsavel: c.responsavel,
    observacoes: c.observacoes,
    criado_em: c.criado_em,
    animais: animaisPorCompra.get(c.id) ?? [],
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PaginaCompras
        localId={localId}
        compras={compras}
        areas={(areas as OpcaoArea[]) ?? []}
        categorias={(categorias as OpcaoCategoria[]) ?? []}
        racas={(racas as OpcaoRaca[]) ?? []}
        categoriasIvz={(categoriasIvz as CategoriaIvz[]) ?? []}
        podeEditar={podeEditar}
      />
    </div>
  );
}
