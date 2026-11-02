// Tabelinha de resumo (descrição + quantidade + total), igual aos cards de
// resumo do app — usada nos históricos de Mortes, Nascimentos etc.
export function TabelaResumo({ titulo, linhas }: { titulo: string; linhas: [string, number][] }) {
  const total = linhas.reduce((soma, [, qtd]) => soma + qtd, 0);
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum registro.</p>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          {linhas.map(([descricao, qtd]) => (
            <div key={descricao} className="flex justify-between gap-2">
              <span className="truncate">{descricao}</span>
              <span className="tabular-nums">{qtd}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-2 border-t pt-1 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{total}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Conta ocorrências de cada chave, da mais frequente pra menos.
export function contar(chaves: string[]): [string, number][] {
  const mapa = new Map<string, number>();
  for (const c of chaves) mapa.set(c, (mapa.get(c) ?? 0) + 1);
  return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
}
