import "server-only";
import type { criarClienteServidor } from "@/lib/supabase/server";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

// Rebanho ativo próprio no formato do card de seleção das rotinas de três
// cards, em páginas de mil (limite do PostgREST).
export async function buscarAnimaisSelecionaveis(supabase: Cliente, localId: string): Promise<AnimalSelecionavel[]> {
  const TAMANHO_PAGINA = 1000;
  const todos: Record<string, unknown>[] = [];
  for (let pagina = 0; ; pagina++) {
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
  }

  return todos.map((a) => ({
    ...(a as unknown as AnimalSelecionavel),
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  }));
}

export async function buscarCicloAtivo(supabase: Cliente, localId: string) {
  const { data } = await supabase
    .from("ciclos")
    .select("nome, data_inicio, data_fim")
    .eq("local_id", localId)
    .eq("ativo", true)
    .maybeSingle();
  return (data as { nome: string; data_inicio: string; data_fim: string | null } | null) ?? null;
}
