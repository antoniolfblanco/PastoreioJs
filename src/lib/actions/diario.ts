"use server";

import { criarClienteServidor } from "@/lib/supabase/server";

export type TipoEventoDiario =
  | "movimentacao"
  | "pesagem"
  | "manejo_sanitario"
  | "morte"
  | "consumo"
  | "castracao"
  | "ajuste_entrada"
  | "ajuste_saida"
  | "furto"
  | "troca_categoria"
  | "nascimento"
  | "cobertura"
  | "diagnostico_gestacao"
  | "venda"
  | "compra"
  | "transferencia_saida"
  | "transferencia_entrada"
  | "outro";

// Uma linha do diário: um evento já registrado por alguma rotina. Vem da RPC
// `diario_do_local` (a mesma do app), que junta as tabelas de rotina e já
// agrupa por evento — um manejo de 300 animais é uma linha só.
export type EventoDiario = {
  tipo: TipoEventoDiario;
  data: string;
  criado_em: string | null;
  responsavel: string | null;
  descricao: string | null;
  detalhe: string | null;
  total_animais: number;
  referencia_id: string | null;
  valor: number | null;
  area_detalhe: string | null;
};

function texto(valor: unknown): string | null {
  const t = typeof valor === "string" ? valor.trim() : "";
  return t === "" ? null : t;
}

function soData(data: Date) {
  return data.toISOString().slice(0, 10);
}

export async function buscarDiario(
  localId: string,
  dias: number,
): Promise<{ eventos: EventoDiario[] } | { error: string }> {
  const ate = new Date();
  const de = new Date();
  de.setDate(de.getDate() - dias);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("diario_do_local", {
    p_local_id: localId,
    p_de: soData(de),
    p_ate: soData(ate),
  });

  if (error) return { error: "Não foi possível carregar o diário: " + error.message };

  const eventos = ((data ?? []) as Record<string, unknown>[]).map((l) => ({
    tipo: (typeof l.tipo === "string" ? l.tipo : "outro") as TipoEventoDiario,
    data: l.data as string,
    criado_em: (l.criado_em as string | null) ?? null,
    responsavel: texto(l.responsavel),
    descricao: texto(l.descricao),
    detalhe: texto(l.detalhe),
    total_animais: Number(l.total_animais ?? 0),
    referencia_id: (l.referencia_id as string | null) ?? null,
    valor: l.valor == null ? null : Number(l.valor),
    area_detalhe: texto(l.area_detalhe),
  }));

  return { eventos };
}
