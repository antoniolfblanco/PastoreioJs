"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoMedicamento = { erro?: string; id?: string } | undefined;

export async function salvarMedicamento(
  _estadoAnterior: EstadoMedicamento,
  formData: FormData,
): Promise<EstadoMedicamento> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const descricao = (formData.get("descricao") as string)?.trim();
  if (!descricao) return { erro: "Informe o nome do medicamento." };

  const marca = (formData.get("marca") as string)?.trim();
  const principioAtivo = (formData.get("principioAtivo") as string)?.trim();
  const dosagem = (formData.get("dosagem") as string)?.trim();
  const observacoes = (formData.get("observacoes") as string)?.trim();
  const ativo = formData.get("ativo") === "on";

  const dados = {
    local_id: localId,
    descricao,
    marca: marca || null,
    principio_ativo: principioAtivo || null,
    dosagem: dosagem || null,
    observacoes: observacoes || null,
    ativo,
  };

  const supabase = await criarClienteServidor();
  const { data, error } = id
    ? await supabase.from("medicamentos").update(dados).eq("id", id).select("id").single()
    : await supabase.from("medicamentos").insert(dados).select("id").single();

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(`/${localId}/medicamentos`);
  revalidatePath(`/${localId}/manejos/sanitarios`);
  return { id: data.id };
}

export async function apagarMedicamento(localId: string, id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("medicamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/${localId}/medicamentos`);
}
