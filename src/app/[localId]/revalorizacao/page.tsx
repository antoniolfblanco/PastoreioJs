import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";
import { ResumoValores } from "./resumo-valores";
import { NovaRevalorizacao } from "./nova-revalorizacao";

// Animal do card de seleção, mais os valores: `valor` (de entrada) e
// `valor_atual` (o reavaliado). O valor de estoque atual é valor_atual ou,
// sem ele, o de entrada — mesma conta do resumo de valores do ciclo.
export type AnimalValor = AnimalSelecionavel & {
  valor: number | null;
  valor_atual: number | null;
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

export default async function RevalorizacaoPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);
  const supabase = await criarClienteServidor();

  const TAMANHO_PAGINA = 1000;
  const brutos: Record<string, unknown>[] = [];
  for (let pagina = 0; ; pagina++) {
    const { data, error } = await supabase
      .from("animais")
      .select(
        "id, nome, brinco, tatuagem, especie, sexo, grau_sangue, valor, valor_atual, areas(nome), categorias!categoria_id(descricao), racas(descricao)",
      )
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo")
      .order("criado_em", { ascending: false })
      .range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);
    if (error) throw new Error("Não foi possível carregar os animais: " + error.message);
    brutos.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }

  const animais: AnimalValor[] = brutos.map((a) => ({
    ...(a as unknown as AnimalValor),
    valor: a.valor == null ? null : Number(a.valor),
    valor_atual: a.valor_atual == null ? null : Number(a.valor_atual),
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <ResumoValores animais={animais} />
      {podeEditar && <NovaRevalorizacao localId={localId} animais={animais} />}
    </div>
  );
}
