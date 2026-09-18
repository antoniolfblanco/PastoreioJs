"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

function grauSangueExigeRegistro(grauSangue: string) {
  return grauSangue !== "SR" && grauSangue !== "Desconhecido";
}

export type EstadoExterno = { erro?: string; id?: string } | undefined;

async function buscarCategoria(localId: string, categoriaId: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select("especie, sexo")
    .eq("id", categoriaId)
    .eq("local_id", localId)
    .single();
  if (error || !data) return null;
  return data;
}

// Animal externo: mesma tabela `animais`, mas sem área/valor/estoque —
// existe só pra compor genealogia (touro de sêmen, doadora de embrião,
// ancestral comprado). `origem_registro`/`situacao` nunca mudam depois de
// criado (é o que a policy de RLS e o trigger do banco esperam).
export async function salvarAnimalExterno(
  _estadoAnterior: EstadoExterno,
  formData: FormData,
): Promise<EstadoExterno> {
  const localId = formData.get("localId") as string;
  const id = formData.get("id") as string | null;
  const categoriaId = formData.get("categoriaId") as string;
  const racaId = formData.get("racaId") as string;

  if (!categoriaId) return { erro: "Selecione a categoria." };
  if (!racaId) return { erro: "Selecione a raça." };

  const categoria = await buscarCategoria(localId, categoriaId);
  if (!categoria) return { erro: "Categoria inválida." };

  const grauSangue = formData.get("grauSangue") as string;
  const exigeRegistro = grauSangueExigeRegistro(grauSangue);

  const dados = {
    categoria_id: categoriaId,
    especie: categoria.especie,
    sexo: categoria.sexo,
    nome: (formData.get("nome") as string)?.trim() || null,
    brinco: (formData.get("brinco") as string)?.trim().toUpperCase() || null,
    tatuagem: (formData.get("tatuagem") as string)?.trim() || null,
    data_nascimento: (formData.get("dataNascimento") as string) || null,
    raca_id: racaId,
    grau_sangue: grauSangue,
    registro_provisorio: exigeRegistro ? (formData.get("registroProvisorio") as string)?.trim() || null : null,
    registro_definitivo: exigeRegistro ? (formData.get("registroDefinitivo") as string)?.trim() || null : null,
    observacoes: (formData.get("observacoes") as string)?.trim() || null,
    pai_id: (formData.get("paiId") as string) || null,
    mae_id: (formData.get("maeId") as string) || null,
  };

  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("animais").update(dados).eq("id", id)
    : await supabase.from("animais").insert({
        ...dados,
        local_id: localId,
        area_id: null,
        origem_registro: "externo",
        situacao: "nao_aplicavel",
      });

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(`/${localId}/reproducao/externos`);
  return {};
}

// Erros esperados (regra de negócio da RPC) viram valor de retorno, nunca
// throw — o Next.js redige qualquer erro lançado (throw) de uma Server
// Function em produção, só mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

export async function apagarAnimalExterno(localId: string, id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_animal", { p_animal_id: id });
  if (error) return { error: error.message };
  revalidatePath(`/${localId}/reproducao/externos`);
  return {};
}
