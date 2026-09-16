// Rateio de um valor total entre itens de uma transação (compra ou venda) —
// cada item é um grupo de N animais que compartilham o mesmo peso por
// cabeça. Só rateia por peso quando TODOS os itens têm peso (misturar
// critérios daria um resultado que ninguém consegue conferir de cabeça);
// senão divide igual. Espelha exatamente utils/rateio_valor.dart do
// PastoreioApp.
export type ItemRateio = { quantidade: number; peso: number | null };

export function rateioPorPeso(itens: ItemRateio[]): boolean {
  return itens.length > 0 && itens.every((i) => i.peso != null && i.peso > 0);
}

// Valor por cabeça de cada item, na mesma ordem recebida. Sem arredondar
// aqui — arredondamento é responsabilidade de quem exibe/grava.
export function ratearValorTotal(total: number, itens: ItemRateio[]): number[] {
  const totalAnimais = itens.reduce((soma, i) => soma + i.quantidade, 0);
  if (totalAnimais === 0) return [];

  if (!rateioPorPeso(itens)) {
    return itens.map(() => total / totalAnimais);
  }

  const pesoTotal = itens.reduce((soma, i) => soma + i.peso! * i.quantidade, 0);
  return itens.map((item) => (total * item.peso!) / pesoTotal);
}
