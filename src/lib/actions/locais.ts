"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoLocal = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/local`;
}

export async function criarLocal(
  _estadoAnterior: EstadoLocal,
  formData: FormData,
): Promise<EstadoLocal> {
  const nome = (formData.get("nome") as string)?.trim();
  if (!nome) return { erro: "Informe o nome do local." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("criar_local", {
    p_nome: nome,
    p_tamanho: null,
    p_endereco: null,
    p_localizacao: null,
    p_observacoes: null,
  });
  if (error || !data) return { erro: "Não foi possível criar o local: " + error?.message };

  redirect(`/${data.id}`);
}

export async function atualizarLocal(
  _estadoAnterior: EstadoLocal,
  formData: FormData,
): Promise<EstadoLocal> {
  const localId = formData.get("localId") as string;
  const nome = (formData.get("nome") as string)?.trim();
  if (!nome) return { erro: "Informe o nome do local." };

  const tamanho = formData.get("tamanho") as string;
  const endereco = (formData.get("endereco") as string)?.trim();
  const localizacao = (formData.get("localizacao") as string)?.trim();
  const observacoes = (formData.get("observacoes") as string)?.trim();

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("locais")
    .update({
      nome,
      tamanho: tamanho ? Number(tamanho) : null,
      endereco: endereco || null,
      localizacao: localizacao || null,
      observacoes: observacoes || null,
    })
    .eq("id", localId);

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(`/${localId}`, "layout");
  return {};
}

// Erros esperados (regra de negócio da RPC) viram valor de retorno, nunca
// throw — o Next.js redige qualquer erro lançado (throw) de uma Server
// Function em produção, só mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

// Não chamam redirect() aqui: são invocadas do cliente dentro de um
// try/catch (pra tratar erro da RPC), e o throw especial do redirect() do
// Next seria capturado pelo catch em vez de navegar. Quem chama decide a
// navegação depois de confirmar sucesso (ver sair-ou-apagar-local.tsx).
export async function apagarLocal(localId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_local_completo", { p_local_id: localId });
  if (error) return { error: error.message };
  return {};
}

export async function sairDoLocal(localId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("sair_do_local", { p_local_id: localId });
  if (error) return { error: error.message };
  return {};
}

export type EstadoConvite = { erro?: string } | undefined;

export async function convidarUsuario(
  _estadoAnterior: EstadoConvite,
  formData: FormData,
): Promise<EstadoConvite> {
  const localId = formData.get("localId") as string;
  const email = (formData.get("email") as string)?.trim();
  const perfil = formData.get("perfil") as string;

  if (!email) return { erro: "Informe o e-mail." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("convidar_usuario", {
    p_local_id: localId,
    p_email: email,
    p_perfil: perfil,
  });

  if (error) return { erro: "Não foi possível convidar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

export async function cancelarConvite(localId: string, conviteId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("cancelar_convite", { p_convite_id: conviteId });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}

export async function alterarPerfilMembro(localId: string, usuarioId: string, perfil: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("alterar_perfil_membro", {
    p_local_id: localId,
    p_usuario_id: usuarioId,
    p_perfil: perfil,
  });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}

export async function removerMembro(localId: string, usuarioId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("remover_membro", {
    p_local_id: localId,
    p_usuario_id: usuarioId,
  });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}

export async function responderConvite(conviteId: string, aceitar: boolean): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("responder_convite", {
    p_convite_id: conviteId,
    p_aceitar: aceitar,
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}
