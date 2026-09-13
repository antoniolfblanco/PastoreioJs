// Pra timestamps completos (ex. `criado_em`, colunas timestamptz).
export function formatarDataHora(data: string | null) {
  if (!data) return "—";
  return new Date(data).toLocaleString("pt-BR");
}
