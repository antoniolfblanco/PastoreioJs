import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type PerfilLocal = "gerente" | "capataz" | "peao";

export type LocalAtual = {
  id: string;
  nome: string;
  codigo: string;
  perfil: PerfilLocal;
};

// Confirma que o usuário logado pertence a esse local e devolve o perfil
// dele nele — a RLS já bloqueia o acesso aos dados, isso aqui é só pra
// decidir o que mostrar/habilitar na tela (ex.: perfil "peao" não vê botão
// de criar/editar).
export async function buscarLocalAtual(localId: string): Promise<LocalAtual> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("usuario_locais")
    .select("perfil, locais(id, nome, codigo)")
    .eq("local_id", localId)
    .maybeSingle();

  if (!data) notFound();

  const local = Array.isArray(data.locais) ? data.locais[0] : data.locais;
  if (!local) notFound();

  return { id: local.id, nome: local.nome, codigo: local.codigo, perfil: data.perfil };
}

export function ehGerente(perfil: PerfilLocal) {
  return perfil === "gerente";
}

// Áreas e categorias são gerenciáveis por gerente ou capataz — peão só lê
// (mesma regra das policies de RLS "gerente ou capataz gerencia ...").
export function podeGerenciarConteudo(perfil: PerfilLocal) {
  return perfil === "gerente" || perfil === "capataz";
}
