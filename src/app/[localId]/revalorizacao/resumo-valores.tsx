"use client";

import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { cn } from "@/lib/utils";
import type { AnimalValor } from "./page";
import { reais, valorEstoque } from "./valores";

const especies = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
] as const;

// Topo da rotina: como está o valor de estoque do rebanho agora, por
// categoria. Não há histórico de revalorizações (o banco só guarda o valor
// atual), então o "antes e depois" se vê aqui.
export function ResumoValores({ animais }: { animais: AnimalValor[] }) {
  const [especie, setEspecie] = useState<string>("bovino");
  const [areasFiltro, setAreasFiltro] = useState<Set<string>>(new Set());

  const daEspecie = useMemo(() => animais.filter((a) => a.especie === especie), [animais, especie]);
  const areas = useMemo(
    () => Array.from(new Set(daEspecie.map((a) => a.area_nome))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [daEspecie],
  );

  const linhas = useMemo(() => {
    const porCategoria = new Map<string, { qtd: number; comValor: number; semValor: number; reavaliados: number; total: number }>();
    for (const a of daEspecie) {
      if (areasFiltro.size > 0 && !areasFiltro.has(a.area_nome)) continue;
      const l = porCategoria.get(a.categoria_descricao) ?? { qtd: 0, comValor: 0, semValor: 0, reavaliados: 0, total: 0 };
      l.qtd++;
      const v = valorEstoque(a);
      if (v == null) l.semValor++;
      else {
        l.comValor++;
        l.total += v;
      }
      if (a.valor_atual != null) l.reavaliados++;
      porCategoria.set(a.categoria_descricao, l);
    }
    return Array.from(porCategoria.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [daEspecie, areasFiltro]);

  const total = linhas.reduce(
    (s, [, l]) => ({
      qtd: s.qtd + l.qtd,
      comValor: s.comValor + l.comValor,
      semValor: s.semValor + l.semValor,
      reavaliados: s.reavaliados + l.reavaliados,
      total: s.total + l.total,
    }),
    { qtd: 0, comValor: 0, semValor: 0, reavaliados: 0, total: 0 },
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Revalorização de Animais</h1>
        <p className="text-sm text-muted-foreground">
          Altera o valor de estoque atual dos animais. O valor de entrada (o do estoque inicial e da compra) não muda.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => setEspecie(e.value)}
              className={cn(buttonVariants({ variant: especie === e.value ? "secondary" : "ghost", size: "sm" }))}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
        <FiltroMultiSelecao
          rotulo="Todas as áreas"
          className="w-full md:w-auto"
          selecionados={areasFiltro}
          onChange={setAreasFiltro}
          opcoes={areas.map((a) => ({ value: a, label: a }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { rotulo: "Animais", valor: String(total.qtd) },
          { rotulo: "Valor de estoque total", valor: reais(total.total) },
          { rotulo: "Valor médio por cabeça", valor: total.comValor ? reais(total.total / total.comValor) : "—" },
          { rotulo: "Sem valor informado", valor: String(total.semValor) },
        ].map((r) => (
          <div key={r.rotulo} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{r.rotulo}</div>
            <div className="text-lg font-semibold tabular-nums">{r.valor}</div>
          </div>
        ))}
      </div>

      {linhas.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nenhum animal ativo nessa seleção.
        </p>
      ) : (
        <div className="max-h-[24rem] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Animais</TableHead>
                <TableHead className="text-right">Revalorizados</TableHead>
                <TableHead className="text-right">Sem valor</TableHead>
                <TableHead className="text-right">Valor médio</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(([categoria, l]) => (
                <TableRow key={categoria}>
                  <TableCell className="font-medium">{categoria}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.qtd}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.reavaliados}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.semValor || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.comValor ? reais(l.total / l.comValor) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{reais(l.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{total.qtd}</TableCell>
                <TableCell className="text-right tabular-nums">{total.reavaliados}</TableCell>
                <TableCell className="text-right tabular-nums">{total.semValor || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {total.comValor ? reais(total.total / total.comValor) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{reais(total.total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        &quot;Revalorizados&quot; já têm valor atual próprio; os demais usam o valor de entrada.
      </p>
    </div>
  );
}
