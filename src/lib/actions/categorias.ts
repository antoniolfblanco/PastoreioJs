"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoCategoria = { erro?: string } | undefined;

export async function salvarCategoria(
  _estadoAnterior: EstadoCategoria,
  formData: FormData,
): Promise<EstadoCategoria> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const categoriaIvzId = formData.get("categoriaIvzId") as string;
  const descricao = (formData.get("descricao") as string)?.trim();
  const grupo = (formData.get("grupo") as string)?.trim();
  const observacao = (formData.get("observacao") as string)?.trim();
  const ordem = formData.get("ordem") as string;
  const ativo = formData.get("ativo") === "on";

  if (!categoriaIvzId) return { erro: "Selecione a categoria IVZ." };
  if (!descricao) return { erro: "Informe a descrição." };

  const supabase = await criarClienteServidor();

  // A espécie e o sexo da categoria são sempre os da categoria IVZ escolhida
  // (o banco tem um gatilho que recusa a gravação se não baterem) — em vez
  // de confiar em campos ocultos do form, busca aqui pra ter certeza.
  const { data: ivz, error: erroIvz } = await supabase
    .from("categorias_ivz")
    .select("especie, sexo")
    .eq("id", categoriaIvzId)
    .single();
  if (erroIvz || !ivz) return { erro: "Categoria IVZ inválida." };

  const dados = {
    local_id: localId,
    categoria_ivz_id: categoriaIvzId,
    especie: ivz.especie,
    sexo: ivz.sexo,
    descricao,
    grupo: grupo || null,
    observacao: observacao || null,
    ordem: ordem ? Number(ordem) : 0,
    ativo,
  };

  const { error } = id
    ? await supabase.from("categorias").update(dados).eq("id", id)
    : await supabase.from("categorias").insert(dados);

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(`/${localId}/categorias`);
  return {};
}

export async function apagarCategoria(localId: string, id: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/${localId}/categorias`);
}

// Copia em lote os templates nacionais (categorias_sugeridas) da espécie
// escolhida pras categorias do local — evita cadastrar uma por uma. Pula as
// que já existem no local (mesma categoria_ivz_id), pra poder chamar de novo
// sem duplicar.
export async function importarCategoriasSugeridas(localId: string, especie: string) {
  const supabase = await criarClienteServidor();

  const [{ data: sugeridas, error: erroSugeridas }, { data: existentes, error: erroExistentes }] =
    await Promise.all([
      supabase
        .from("categorias_sugeridas")
        .select("descricao, especie, sexo, ordem, categoria_ivz_id")
        .eq("especie", especie)
        .eq("ativo", true)
        .order("ordem"),
      supabase.from("categorias").select("categoria_ivz_id").eq("local_id", localId),
    ]);

  if (erroSugeridas) throw new Error(erroSugeridas.message);
  if (erroExistentes) throw new Error(erroExistentes.message);

  const jaTem = new Set((existentes ?? []).map((c) => c.categoria_ivz_id));
  const novas = (sugeridas ?? [])
    .filter((s) => !jaTem.has(s.categoria_ivz_id))
    .map((s) => ({
      local_id: localId,
      categoria_ivz_id: s.categoria_ivz_id,
      especie: s.especie,
      sexo: s.sexo,
      descricao: s.descricao,
      ordem: s.ordem,
    }));

  if (novas.length === 0) return;

  const { error } = await supabase.from("categorias").insert(novas);
  if (error) throw new Error(error.message);
  revalidatePath(`/${localId}/categorias`);
}
