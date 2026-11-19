"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

// Transferências entre propriedades: saída na origem + entrada no destino.
// Entre fazendas do sistema a transferência fica pendente até o destino
// confirmar (ou recusar); com fazenda de fora já nasce concluída.
// Erros viram retorno, nunca throw (o Next redige a mensagem em produção).

export type ResultadoTransferencia = { error?: string };

function caminho(localId: string) {
  return `/${localId}/transferencias`;
}

function numeroOuNulo(texto: string | null | undefined) {
  if (!texto) return null;
  const n = Number(texto);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function buscarLocalPorCodigo(codigo: string): Promise<{ id: string; nome: string } | { error: string }> {
  const limpo = codigo.trim();
  if (!limpo) return { error: "Informe o código da propriedade." };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("buscar_local_por_codigo", { p_codigo: limpo });
  if (error) return { error: "Não foi possível buscar: " + error.message };
  const local = (data as { id: string; nome: string }[] | null)?.[0];
  if (!local) return { error: "Nenhuma propriedade com esse código." };
  return local;
}

export type DestinoTransferencia = { tipo: "local"; id: string } | { tipo: "externo"; nome: string };

export async function enviarTransferencia(
  localId: string,
  dados: {
    destino: DestinoTransferencia;
    animalIds: string[];
    data: string;
    responsavel: string;
    descricao: string;
    observacoes: string;
    valorPorCabeca: string;
  },
): Promise<ResultadoTransferencia> {
  if (dados.animalIds.length === 0) return { error: "Selecione ao menos um animal." };
  if (!dados.data) return { error: "Informe a data." };
  const comum = {
    p_animal_ids: dados.animalIds,
    p_data: dados.data,
    p_responsavel: dados.responsavel.trim() || null,
    p_observacoes: dados.observacoes.trim() || null,
    p_descricao: dados.descricao.trim() || null,
    p_valor_atual: numeroOuNulo(dados.valorPorCabeca),
  };

  const supabase = await criarClienteServidor();
  let error;
  if (dados.destino.tipo === "local") {
    if (dados.destino.id === localId) return { error: "O destino precisa ser outra propriedade." };
    ({ error } = await supabase.rpc("enviar_transferencia", {
      p_local_origem_id: localId,
      p_local_destino_id: dados.destino.id,
      ...comum,
    }));
  } else {
    if (!dados.destino.nome.trim()) return { error: "Informe a propriedade de destino." };
    ({ error } = await supabase.rpc("enviar_transferencia_externa", {
      p_local_origem_id: localId,
      p_destino_externo: dados.destino.nome.trim(),
      ...comum,
    }));
  }
  if (error) return { error: "Não foi possível transferir: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}

export async function confirmarTransferencia(
  localId: string,
  transferenciaId: string,
  dados: { areaId: string; categoriaId: string; racaId: string; importarPais: boolean; valorPorCabeca: string },
): Promise<ResultadoTransferencia> {
  if (!dados.areaId) return { error: "Selecione a área." };
  if (!dados.categoriaId) return { error: "Selecione a categoria." };
  if (!dados.racaId) return { error: "Selecione a raça." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("confirmar_transferencia", {
    p_transferencia_id: transferenciaId,
    p_area_id: dados.areaId,
    p_categoria_id: dados.categoriaId,
    p_raca_id: dados.racaId,
    p_importar_pais: dados.importarPais,
    p_valor: numeroOuNulo(dados.valorPorCabeca),
  });
  if (error) return { error: "Não foi possível confirmar: " + error.message };
  revalidatePath(`/${localId}`, "layout");
  return {};
}

export async function recusarTransferencia(
  localId: string,
  transferenciaId: string,
  motivo: string,
): Promise<ResultadoTransferencia> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("recusar_transferencia", {
    p_transferencia_id: transferenciaId,
    p_motivo: motivo.trim() || null,
  });
  if (error) return { error: "Não foi possível recusar: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}

export type LoteEntradaExterna = {
  categoriaId: string;
  areaId: string;
  racaId: string;
  grauSangue: string;
  quantidade: number;
  valorPorCabeca: string;
  brincos: string[];
};

export async function registrarEntradaExterna(
  localId: string,
  dados: { origem: string; data: string; responsavel: string; descricao: string; observacoes: string },
  lotes: LoteEntradaExterna[],
): Promise<ResultadoTransferencia> {
  if (!dados.origem.trim()) return { error: "Informe a propriedade de origem." };
  if (!dados.data) return { error: "Informe a data." };
  if (lotes.length === 0) return { error: "Adicione ao menos um lote." };

  const supabase = await criarClienteServidor();
  // O sexo vem da categoria (como no acerto de contagem).
  const { data: categorias, error: erroCategorias } = await supabase
    .from("categorias")
    .select("id, sexo")
    .eq("local_id", localId)
    .in(
      "id",
      lotes.map((l) => l.categoriaId),
    );
  if (erroCategorias) return { error: "Não foi possível carregar as categorias: " + erroCategorias.message };
  const sexoPorCategoria = new Map((categorias ?? []).map((c) => [c.id as string, c.sexo as string]));

  const { error } = await supabase.rpc("registrar_transferencia_externa_entrada", {
    p_local_id: localId,
    p_origem_externa: dados.origem.trim(),
    p_data: dados.data,
    p_responsavel: dados.responsavel.trim() || null,
    p_observacoes: dados.observacoes.trim() || null,
    p_descricao: dados.descricao.trim() || null,
    p_lotes: lotes.map((l) => ({
      categoria_id: l.categoriaId,
      area_id: l.areaId,
      raca_id: l.racaId,
      sexo: sexoPorCategoria.get(l.categoriaId) ?? "desconhecido",
      grau_sangue: l.grauSangue || "Desconhecido",
      quantidade: l.quantidade,
      valor: numeroOuNulo(l.valorPorCabeca),
      brincos: l.brincos,
    })),
  });
  if (error) return { error: "Não foi possível registrar a entrada: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}
