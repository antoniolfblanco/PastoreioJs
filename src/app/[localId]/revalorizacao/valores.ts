// Valor de estoque atual: o reavaliado (valor_atual) ou, sem ele, o de
// entrada (valor) — mesma conta do resumo de valores do ciclo.
export function valorEstoque(a: { valor: number | null; valor_atual: number | null }) {
  return a.valor_atual ?? a.valor;
}

export function reais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
