"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

function caminho(localId: string) {
  return `/${localId}/reproducao/lotes-rm`;
}

export type EstadoLoteRm = { erro?: string; id?: string } | undefined;

// Lote RM: grupo de touros PRÓPRIOS soltos junto com as fêmeas na monta
// natural, usado como "pai" da cobertura quando não dá pra saber qual touro
// cobriu cada fêmea — nunca aceita touro externo (o banco garante isso com
// um trigger em lotes_rm_touros).
export async function salvarLoteRm(
  _estadoAnterior: EstadoLoteRm,
  formData: FormData,
): Promise<EstadoLoteRm> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const nome = (formData.get("nome") as string)?.trim();
  if (!nome) return { erro: "Informe o nome do lote." };

  const supabase = await criarClienteServidor();
  const { data, error } = id
    ? await supabase.from("lotes_rm").update({ nome }).eq("id", id).select("id").single()
    : await supabase.from("lotes_rm").insert({ local_id: localId, nome }).select("id").single();

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(caminho(localId));
  return { id: data.id };
}

// Erros esperados (regra de negócio da RPC) viram valor de retorno, nunca
// throw — o Next.js redige qualquer erro lançado (throw) de uma Server
// Function em produção, só mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

export async function apagarLoteRm(localId: string, id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("lotes_rm").delete().eq("id", id);
  if (error) return { error: "Não foi possível apagar — ele já foi usado em alguma cobertura." };
  revalidatePath(caminho(localId));
  return {};
}

export async function adicionarTouroLote(localId: string, loteRmId: string, touroId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("lotes_rm_touros").insert({ lote_rm_id: loteRmId, local_id: localId, touro_id: touroId });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}

export async function removerTouroLote(localId: string, loteRmId: string, touroId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("lotes_rm_touros").delete().eq("lote_rm_id", loteRmId).eq("touro_id", touroId);
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}
