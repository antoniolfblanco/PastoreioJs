"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

// Um lote da revalorização: os animais e o valor novo por cabeça.
export type LoteRevalorizacao = { animalIds: string[]; valorPorCabeca: number };

// Altera o valor de estoque atual (animais.valor_atual) — é o campo que o
// resumo de valores do ciclo lê como "reavaliação do rebanho". Nunca mexe em
// `valor` (o de entrada), que é o que entra no valor inicial do ciclo.
// Sem histórico próprio (decisão do usuário): o valor anterior se perde.
export async function revalorizarAnimais(
  localId: string,
  lotes: LoteRevalorizacao[],
): Promise<{ error?: string; atualizados?: number }> {
  if (lotes.length === 0) return { error: "Nenhum animal na lista." };
  for (const l of lotes) {
    if (!(l.valorPorCabeca > 0)) return { error: "Informe um valor por cabeça maior que zero." };
    if (l.animalIds.length === 0) return { error: "Há um lote sem animais." };
  }

  const supabase = await criarClienteServidor();
  let atualizados = 0;
  // Em blocos: o filtro vai na URL da requisição, e mil ids estouram o tamanho.
  const BLOCO = 200;
  for (const l of lotes) {
    for (let i = 0; i < l.animalIds.length; i += BLOCO) {
      const ids = l.animalIds.slice(i, i + BLOCO);
      const { data, error } = await supabase
        .from("animais")
        .update({ valor_atual: Math.round(l.valorPorCabeca * 100) / 100 })
        .eq("local_id", localId)
        .eq("situacao", "ativo")
        .in("id", ids)
        .select("id");
      if (error) {
        revalidatePath(`/${localId}/revalorizacao`);
        return {
          error:
            (atualizados > 0 ? `${atualizados} animal(is) já foram atualizados, mas o resto falhou: ` : "Não foi possível atualizar: ") +
            error.message,
          atualizados,
        };
      }
      atualizados += data?.length ?? 0;
    }
  }

  revalidatePath(`/${localId}/revalorizacao`);
  revalidatePath(`/${localId}/animais`);
  return { atualizados };
}
