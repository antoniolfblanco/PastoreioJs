"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoArea = { erro?: string; id?: string } | undefined;

export async function salvarArea(
  _estadoAnterior: EstadoArea,
  formData: FormData,
): Promise<EstadoArea> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const nome = (formData.get("nome") as string)?.trim();
  if (!nome) return { erro: "Informe o nome da área." };

  const tipo = (formData.get("tipo") as string)?.trim();
  const tamanho = formData.get("tamanho") as string;
  const observacoes = (formData.get("observacoes") as string)?.trim();
  const ativo = formData.get("ativo") === "on";

  const dados = {
    local_id: localId,
    nome,
    tipo: tipo || null,
    tamanho: tamanho ? Number(tamanho) : null,
    observacoes: observacoes || null,
    ativo,
  };

  const supabase = await criarClienteServidor();
  const { data, error } = id
    ? await supabase.from("areas").update(dados).eq("id", id).select("id").single()
    : await supabase.from("areas").insert(dados).select("id").single();

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(`/${localId}/areas`);
  return { id: data.id };
}

// Erros esperados viram valor de retorno, nunca throw — o Next.js redige
// qualquer erro lançado (throw) de uma Server Function em produção, só
// mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

export async function apagarArea(localId: string, id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("areas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/${localId}/areas`);
  return {};
}
