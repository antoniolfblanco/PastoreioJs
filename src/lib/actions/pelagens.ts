"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoPelagem = { erro?: string; id?: string } | undefined;

export async function salvarPelagem(_estadoAnterior: EstadoPelagem, formData: FormData): Promise<EstadoPelagem> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const descricao = (formData.get("descricao") as string)?.trim();
  if (!descricao) return { erro: "Informe o nome da pelagem." };

  const observacoes = (formData.get("observacoes") as string)?.trim();
  const ativo = formData.get("ativo") === "on";
  const dados = { local_id: localId, descricao, observacoes: observacoes || null, ativo };

  const supabase = await criarClienteServidor();
  const { data, error } = id
    ? await supabase.from("pelagens").update(dados).eq("id", id).select("id").single()
    : await supabase.from("pelagens").insert(dados).select("id").single();

  if (error) {
    if (error.code === "23505") return { erro: `Já existe a pelagem "${descricao}".` };
    return { erro: "Não foi possível salvar: " + error.message };
  }

  revalidatePath(`/${localId}/pelagens`);
  revalidatePath(`/${localId}/animais`);
  return { id: data.id };
}

// Erros viram retorno, nunca throw (o Next redige a mensagem em produção).
export type ResultadoAcao = { error?: string };

export async function apagarPelagem(localId: string, id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  // Animais com essa pelagem ficam sem pelagem (FK on delete set null).
  const { error } = await supabase.from("pelagens").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/${localId}/pelagens`);
  return {};
}
