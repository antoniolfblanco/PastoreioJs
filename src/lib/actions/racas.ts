"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoRaca = { erro?: string; id?: string } | undefined;

export async function salvarRaca(
  _estadoAnterior: EstadoRaca,
  formData: FormData,
): Promise<EstadoRaca> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const descricao = (formData.get("descricao") as string)?.trim();
  if (!descricao) return { erro: "Informe o nome da raça." };

  const observacoes = (formData.get("observacoes") as string)?.trim();
  let ativo = formData.get("ativo") === "on";

  const supabase = await criarClienteServidor();

  if (id) {
    const { data: atual } = await supabase.from("racas").select("padrao").eq("id", id).single();
    if (atual?.padrao) ativo = true;
  }

  const dados = { local_id: localId, descricao, observacoes: observacoes || null, ativo };

  const { data, error } = id
    ? await supabase.from("racas").update(dados).eq("id", id).select("id").single()
    : await supabase.from("racas").insert(dados).select("id").single();

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(`/${localId}/racas`);
  revalidatePath(`/${localId}/animais`);
  return { id: data.id };
}

// Erros esperados (regra de negócio) viram valor de retorno, nunca throw —
// o Next.js redige qualquer erro lançado (throw) de uma Server Function em
// produção, só mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

export async function apagarRaca(localId: string, id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { data: raca } = await supabase.from("racas").select("padrao").eq("id", id).single();
  if (raca?.padrao) return { error: "Não é possível apagar a raça padrão do local." };

  const { error } = await supabase.from("racas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/${localId}/racas`);
  return {};
}
