"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ResumoExclusaoReprodutiva } from "../../app/[localId]/reproducao/_componentes/dialogo-apagar-reprodutivo";

function caminho(localId: string) {
  return `/${localId}/reproducao/eventos`;
}

export type EstadoEvento = { erro?: string } | undefined;

// Evento reprodutivo: camada entre estação e cobertura (ex.: "IATF Lote
// 1") — agrupa as fêmeas que vão participar da mesma rodada de cobertura.
// Criação é INSERT direto (nunca teve RPC própria, igual ao Flutter);
// depois de existir, editar passa pela RPC porque método/espécie ficam
// travados assim que há cobertura lançada.
export async function salvarEventoReprodutivo(
  _estadoAnterior: EstadoEvento,
  formData: FormData,
): Promise<EstadoEvento> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const nome = (formData.get("nome") as string)?.trim();
  if (!nome) return { erro: "Informe o nome do evento." };

  const metodo = formData.get("metodo") as string;
  const especie = formData.get("especie") as string;
  const dataInicio = formData.get("dataInicio") as string;
  if (!dataInicio) return { erro: "O evento precisa de uma data." };

  const supabase = await criarClienteServidor();

  if (id) {
    const { error } = await supabase.rpc("atualizar_evento_reprodutivo", {
      p_evento_id: id,
      p_nome: nome,
      p_metodo: metodo,
      p_especie: especie,
      p_data_inicio: dataInicio,
    });
    if (error) return { erro: "Não foi possível salvar: " + error.message };
    revalidatePath(caminho(localId));
    return {};
  }

  const estacaoId = formData.get("estacaoId") as string;
  if (!estacaoId) return { erro: "Selecione a estação." };

  const { error } = await supabase.from("eventos_reprodutivos").insert({
    estacao_id: estacaoId,
    local_id: localId,
    nome,
    metodo,
    especie,
    data_inicio: dataInicio,
  });

  if (error) return { erro: "Não foi possível criar: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}

export async function buscarResumoEventoParaExclusao(eventoId: string): Promise<ResumoExclusaoReprodutiva> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("resumo_evento_para_exclusao", { p_evento_id: eventoId });
  if (error) throw new Error(error.message);
  return data as ResumoExclusaoReprodutiva;
}

export async function apagarEventoReprodutivo(localId: string, eventoId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_evento_reprodutivo", { p_evento_id: eventoId });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}
