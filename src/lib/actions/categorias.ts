"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoCategoria = { erro?: string; id?: string; sexo?: string } | undefined;

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

  const { data, error } = id
    ? await supabase.from("categorias").update(dados).eq("id", id).select("id").single()
    : await supabase.from("categorias").insert(dados).select("id").single();

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(`/${localId}/categorias`);
  return { id: data.id, sexo: ivz.sexo };
}

// Erros esperados viram valor de retorno, nunca throw — o Next.js redige
// qualquer erro lançado (throw) de uma Server Function em produção, só
// mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

export async function apagarCategoria(localId: string, id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/${localId}/categorias`);
  return {};
}

// Copia os templates nacionais (categorias_sugeridas) escolhidos na tela de
// importação pras categorias do local — evita cadastrar uma por uma.
// `sugeridaIds` são os ids marcados pelo usuário. A checagem de duplicata é
// por descrição, não por categoria_ivz_id: o IVZ é um código oficial que
// várias sugestões podem compartilhar (ex.: "Potros" e "Potrancos" são
// ambas "Equinos Machos +6 Meses" pro IVZ), então duas categorias distintas
// do local podem legitimamente apontar pro mesmo categoria_ivz_id.
export async function importarCategoriasSugeridas(localId: string, sugeridaIds: string[]): Promise<ResultadoAcao> {
  if (sugeridaIds.length === 0) return {};

  const supabase = await criarClienteServidor();

  const [{ data: sugeridas, error: erroSugeridas }, { data: existentes, error: erroExistentes }] =
    await Promise.all([
      supabase
        .from("categorias_sugeridas")
        .select("descricao, especie, sexo, ordem, categoria_ivz_id")
        .in("id", sugeridaIds),
      supabase.from("categorias").select("descricao").eq("local_id", localId),
    ]);

  if (erroSugeridas) return { error: erroSugeridas.message };
  if (erroExistentes) return { error: erroExistentes.message };

  const jaTem = new Set((existentes ?? []).map((c) => c.descricao.trim().toLowerCase()));
  const novas = (sugeridas ?? [])
    .filter((s) => !jaTem.has(s.descricao.trim().toLowerCase()))
    .map((s) => ({
      local_id: localId,
      categoria_ivz_id: s.categoria_ivz_id,
      especie: s.especie,
      sexo: s.sexo,
      descricao: s.descricao,
      ordem: s.ordem,
    }));

  if (novas.length === 0) return {};

  const { error } = await supabase.from("categorias").insert(novas);
  if (error) return { error: error.message };
  revalidatePath(`/${localId}/categorias`);
  return {};
}
