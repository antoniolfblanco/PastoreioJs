import type { TipoEventoDiario } from "@/lib/actions/diario";

// Rótulo de cada tipo de evento do diário (os mesmos do app). Fica fora do
// componente pra servir também ao PDF e ao filtro por tipo.
export const rotulosTipoDiario: Record<TipoEventoDiario, string> = {
  movimentacao: "Movimentação",
  pesagem: "Pesagem",
  manejo_sanitario: "Manejo sanitário",
  morte: "Morte",
  consumo: "Consumo interno",
  castracao: "Castração",
  ajuste_entrada: "Ajuste de entrada",
  ajuste_saida: "Ajuste de saída",
  furto: "Roubo ou furto",
  troca_categoria: "Troca de categoria",
  nascimento: "Nascimento",
  cobertura: "Cobertura",
  diagnostico_gestacao: "Diagnóstico de gestação",
  venda: "Venda",
  compra: "Compra",
  transferencia_saida: "Transferência enviada",
  transferencia_entrada: "Transferência recebida",
  outro: "Registro",
};
