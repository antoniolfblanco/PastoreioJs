"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoEstacao = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/reproducao/estacoes`;
}

// Uma função só pras duas RPCs (abrir/atualizar), igual ao padrão já usado
// em Áreas/Raças/Medicamentos — o `id` no formData decide qual chamar.
// Espécie só existe na abertura: depois de criada, a estação não muda de
// espécie.
export async function salvarEstacaoReprodutiva(
  _estadoAnterior: EstadoEstacao,
  formData: FormData,
): Promise<EstadoEstacao> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const nome = (formData.get("nome") as string)?.trim();
  if (!nome) return { erro: "Informe o nome da estação." };

  const dataInicio = formData.get("dataInicio") as string;
  if (!dataInicio) return { erro: "Informe a data de início." };

  const supabase = await criarClienteServidor();

  if (id) {
    const dataFim = (formData.get("dataFim") as string) || null;
    const { error } = await supabase.rpc("atualizar_estacao_reprodutiva", {
      p_estacao_id: id,
      p_nome: nome,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });

    if (error) return { erro: "Não foi possível salvar: " + error.message };
    revalidatePath(caminho(localId));
    return {};
  }

  const especie = formData.get("especie") as string;
  const { error } = await supabase.rpc("abrir_estacao_reprodutiva", {
    p_local_id: localId,
    p_nome: nome,
    p_data_inicio: dataInicio,
    p_especie: especie,
  });

  if (error) return { erro: "Não foi possível abrir a estação: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}

export async function apagarEstacaoReprodutiva(localId: string, id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_estacao_reprodutiva", { p_estacao_id: id });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}
