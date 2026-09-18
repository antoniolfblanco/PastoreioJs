"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

// Grau de sangue que não exige registro (SR e Desconhecido) — replica
// `GrauSangue.exigeRegistro` do app Flutter: os campos de registro
// provisório/definitivo só fazem sentido, e só são gravados, fora desses
// dois casos.
function grauSangueExigeRegistro(grauSangue: string) {
  return grauSangue !== "SR" && grauSangue !== "Desconhecido";
}

export type EstadoAnimal = { erro?: string; id?: string; brinco?: string | null } | undefined;

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

export async function criarAnimal(
  _estadoAnterior: EstadoAnimal,
  formData: FormData,
): Promise<EstadoAnimal> {
  const localId = formData.get("localId") as string;
  const areaId = formData.get("areaId") as string;
  const categoriaId = formData.get("categoriaId") as string;
  const racaId = formData.get("racaId") as string;

  if (!areaId) return { erro: "Selecione a área." };
  if (!categoriaId) return { erro: "Selecione a categoria." };
  if (!racaId) return { erro: "Selecione a raça." };

  // Espécie e sexo são sempre derivados da categoria escolhida, nunca
  // digitados à parte — busca aqui pra ter o valor autoritativo (o mesmo
  // dado que o dropdown já mostrava, mas confirmado no servidor).
  const categoria = await buscarCategoria(localId, categoriaId);
  if (!categoria) return { erro: "Categoria inválida." };

  const grauSangue = formData.get("grauSangue") as string;
  const exigeRegistro = grauSangueExigeRegistro(grauSangue);
  const valorTexto = formData.get("valor") as string;

  const dados = {
    local_id: localId,
    area_id: areaId,
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
    origem_registro: "proprio",
    situacao: "ativo",
    pai_id: (formData.get("paiId") as string) || null,
    mae_id: (formData.get("maeId") as string) || null,
    receptora_id: (formData.get("receptoraId") as string) || null,
    castrado: categoria.sexo === "macho" && formData.get("castrado") === "on",
    // Só cadastro direto soma no estoque inicial do ciclo — nascimento e
    // compra (rotinas futuras) nunca representam uma categoria nele.
    origem_entrada: "cadastro_direto",
    categoria_estoque_inicial_id: categoriaId,
    valor: valorTexto ? Number(valorTexto) : null,
  };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("animais").insert(dados).select("id, brinco").single();
  if (error) return { erro: "Não foi possível cadastrar o animal: " + error.message };

  revalidatePath(`/${localId}/animais`);
  return { id: data.id, brinco: data.brinco };
}

export async function criarAnimaisEmLote(
  _estadoAnterior: EstadoAnimal,
  formData: FormData,
): Promise<EstadoAnimal> {
  const localId = formData.get("localId") as string;
  const areaId = formData.get("areaId") as string;
  const categoriaId = formData.get("categoriaId") as string;
  const racaId = formData.get("racaId") as string;
  const quantidade = Number(formData.get("quantidade"));

  if (!areaId) return { erro: "Selecione a área." };
  if (!categoriaId) return { erro: "Selecione a categoria." };
  if (!racaId) return { erro: "Selecione a raça." };
  if (!Number.isInteger(quantidade) || quantidade < 1) return { erro: "Informe uma quantidade válida." };

  const categoria = await buscarCategoria(localId, categoriaId);
  if (!categoria) return { erro: "Categoria inválida." };

  const grauSangue = formData.get("grauSangue") as string;
  const exigeRegistro = grauSangueExigeRegistro(grauSangue);
  const valorTexto = formData.get("valor") as string;

  const linha = {
    local_id: localId,
    area_id: areaId,
    categoria_id: categoriaId,
    especie: categoria.especie,
    sexo: categoria.sexo,
    data_nascimento: (formData.get("dataNascimento") as string) || null,
    raca_id: racaId,
    grau_sangue: grauSangue,
    registro_provisorio: exigeRegistro ? (formData.get("registroProvisorio") as string)?.trim() || null : null,
    registro_definitivo: exigeRegistro ? (formData.get("registroDefinitivo") as string)?.trim() || null : null,
    observacoes: (formData.get("observacoes") as string)?.trim() || null,
    origem_registro: "proprio",
    situacao: "ativo",
    castrado: false,
    origem_entrada: "cadastro_direto",
    categoria_estoque_inicial_id: categoriaId,
    valor: valorTexto ? Number(valorTexto) : null,
  };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("animais").insert(Array.from({ length: quantidade }, () => linha));
  if (error) return { erro: "Não foi possível cadastrar os animais: " + error.message };

  revalidatePath(`/${localId}/animais`);
  return {};
}

export async function atualizarAnimal(
  _estadoAnterior: EstadoAnimal,
  formData: FormData,
): Promise<EstadoAnimal> {
  const id = formData.get("id") as string;
  const localId = formData.get("localId") as string;
  const areaId = formData.get("areaId") as string;
  const categoriaId = formData.get("categoriaId") as string;
  const racaId = formData.get("racaId") as string;

  if (!areaId) return { erro: "Selecione a área." };
  if (!categoriaId) return { erro: "Selecione a categoria." };
  if (!racaId) return { erro: "Selecione a raça." };

  const categoria = await buscarCategoria(localId, categoriaId);
  if (!categoria) return { erro: "Categoria inválida." };

  const grauSangue = formData.get("grauSangue") as string;
  const exigeRegistro = grauSangueExigeRegistro(grauSangue);
  const valorTexto = formData.get("valor") as string;

  // Não reenvia local_id, origem_registro, origem_entrada, situacao nem
  // categoria_estoque_inicial_id — ficam congelados no valor da criação,
  // igual ao app Flutter (editar não deveria "reabrir" a conta do saldo
  // inicial, que já foi somado uma vez lá atrás).
  const dados = {
    area_id: areaId,
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
    receptora_id: (formData.get("receptoraId") as string) || null,
    castrado: categoria.sexo === "macho" && formData.get("castrado") === "on",
    valor: valorTexto ? Number(valorTexto) : null,
  };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("animais").update(dados).eq("id", id);
  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(`/${localId}/animais`);
  return {};
}

// Erros esperados (regra de negócio da RPC) viram valor de retorno, nunca
// throw — o Next.js redige qualquer erro lançado (throw) de uma Server
// Function em produção, só mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

export async function apagarAnimal(localId: string, id: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_animal", { p_animal_id: id });
  if (error) return { error: error.message };
  revalidatePath(`/${localId}/animais`);
  return {};
}
