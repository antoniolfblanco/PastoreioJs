"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { abrirCiclo } from "@/lib/ciclos";

export async function criarCiclo(localId: string, nome: string, dataInicio: string): Promise<{ error?: string }> {
  const supabase = await criarClienteServidor();
  const r = await abrirCiclo(supabase, localId, nome, dataInicio);
  if (r.error) return r;
  // O ciclo ativo aparece em quase toda tela (filtros "Ciclo ..."), e o
  // aviso de "sem ciclo" fica no layout.
  revalidatePath(`/${localId}`, "layout");
  return {};
}
