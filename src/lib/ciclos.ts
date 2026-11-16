import "server-only";
import type { criarClienteServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

// Cria o ciclo pela RPC do app (criar_ciclo): fecha o ativo (data_fim = dia
// anterior ao início do novo, com o estoque e o valor finais) e abre o novo
// com o rebanho vivo de agora como estoque inicial. Tudo numa transação.
export async function abrirCiclo(supabase: Cliente, localId: string, nome: string, dataInicio: string) {
  if (!nome.trim()) return { error: "Informe o nome do ciclo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) return { error: "Informe a data de início do ciclo." };

  // O ciclo atual termina no dia anterior ao início do novo, então o novo
  // precisa começar depois do início do atual.
  const { data: ativo } = await supabase
    .from("ciclos")
    .select("nome, data_inicio")
    .eq("local_id", localId)
    .eq("ativo", true)
    .maybeSingle();
  if (ativo && dataInicio <= ativo.data_inicio) {
    return { error: `O novo ciclo precisa começar depois do início do ciclo atual (${ativo.nome}).` };
  }

  const { error } = await supabase.rpc("criar_ciclo", {
    p_local_id: localId,
    p_nome: nome.trim(),
    p_data_inicio: dataInicio,
  });
  if (error) return { error: "Não foi possível criar o ciclo: " + error.message };
  return {};
}
