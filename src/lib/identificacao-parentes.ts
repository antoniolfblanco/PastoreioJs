import "server-only";
import type { criarClienteServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;
export type RefAnimal = { nome: string | null; brinco: string | null; tatuagem: string | null };

// Identificação (brinco, tatuagem, nome) de animais pelo id — usada para pai,
// mãe e receptora. Não dá para trazer isso por embed (`animais!pai_id(...)`):
// como a FK aponta para a própria tabela `animais`, o PostgREST pode resolver
// o embed no sentido contrário (os FILHOS em vez do pai), e a tela mostrava
// pai/mãe em branco mesmo com eles gravados.
export async function buscarRefsAnimais(supabase: Cliente, ids: (string | null | undefined)[]) {
  const unicos = Array.from(new Set(ids.filter((id): id is string => !!id)));
  const refs = new Map<string, RefAnimal>();
  const bloco = 200;
  for (let i = 0; i < unicos.length; i += bloco) {
    const { data, error } = await supabase
      .from("animais")
      .select("id, nome, brinco, tatuagem")
      .in("id", unicos.slice(i, i + bloco));
    if (error) throw new Error("Não foi possível carregar pai/mãe: " + error.message);
    for (const a of data ?? []) refs.set(a.id, { nome: a.nome, brinco: a.brinco, tatuagem: a.tatuagem });
  }
  return refs;
}
