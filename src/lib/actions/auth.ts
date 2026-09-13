"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/server";

// Pra montar um link absoluto (e-mail de recuperação de senha) sem
// depender de variável de ambiente com o domínio fixo — funciona tanto em
// localhost quanto em produção/preview do Vercel.
async function origemAtual() {
  const cabecalhos = await headers();
  const origem = cabecalhos.get("origin");
  if (origem) return origem;
  const host = cabecalhos.get("host");
  const proto = cabecalhos.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export type EstadoAuth = { erro?: string } | undefined;

export async function entrar(
  _estadoAnterior: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const email = formData.get("email") as string;
  const senha = formData.get("senha") as string;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha inválidos." };

  // Sem isso, o Next reaproveita o cache do "/" de antes do login (vazio ou
  // com a lista de locais desatualizada), e só corrige com F5 manual.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function cadastrar(
  _estadoAnterior: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;
  const senha = formData.get("senha") as string;
  const confirmarSenha = formData.get("confirmarSenha") as string;

  // O campo já é validado no navegador, mas confere de novo aqui — o
  // formulário pode ser enviado sem JS ou de outra forma.
  if (senha !== confirmarSenha) return { erro: "As senhas não coincidem." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (error) return { erro: "Não foi possível criar a conta: " + error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

export type EstadoRecuperarSenha = { erro?: string; enviado?: boolean } | undefined;

// Sempre devolve sucesso (mesmo se o e-mail não existir) — evita que
// alguém descubra se um e-mail tem conta só testando aqui.
export async function solicitarRecuperacaoSenha(
  _estadoAnterior: EstadoRecuperarSenha,
  formData: FormData,
): Promise<EstadoRecuperarSenha> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) return { erro: "Informe o e-mail." };

  const supabase = await criarClienteServidor();
  const origem = await origemAtual();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/redefinir-senha`,
  });

  return { enviado: true };
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
