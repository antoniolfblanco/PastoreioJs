"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, MapPin, LayoutGrid, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { CategoriaLotacao, Especie } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

type ColunaId = "descricao" | "total";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "descricao", rotulo: "Categoria" },
  { id: "total", rotulo: "Total", alinhamento: "right" },
];

function valorOrdenacao(c: CategoriaLotacao, coluna: ColunaId): string | number {
  switch (coluna) {
    case "descricao":
      return c.descricao.toLowerCase();
    case "total":
      return c.total;
  }
}

type Props = {
  localId: string;
  categorias: CategoriaLotacao[];
};

export function ListaLotacaoCategorias({ localId, categorias }: Props) {
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>("bovino");
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({
    coluna: "total",
    desc: true,
  });
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  const categoriasDaEspecie = useMemo(
    () => categorias.filter((c) => c.especie === especieSelecionada),
    [categorias, especieSelecionada],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  function alternarExpandida(id: string) {
    setExpandidas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const dados = useMemo(() => {
    return [...categoriasDaEspecie].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [categoriasDaEspecie, ordenacao]);

  const totalGeral = useMemo(() => dados.reduce((soma, c) => soma + c.total, 0), [dados]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lotação por Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Quantidade atual do rebanho em cada categoria — clique numa linha pra ver a divisão por área.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => setEspecieSelecionada(e.value)}
              className={cn(
                buttonVariants({ variant: especieSelecionada === e.value ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <LayoutGrid className="size-8" />
          <p>Nenhuma categoria cadastrada para esta espécie.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              {colunas.map((coluna) => (
                <TableHead key={coluna.id} className={coluna.alinhamento === "right" ? "text-right" : undefined}>
                  <button
                    type="button"
                    onClick={() => ordenarPor(coluna.id)}
                    className={`inline-flex items-center gap-1 hover:text-foreground ${
                      coluna.alinhamento === "right" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {coluna.rotulo}
                    {ordenacao.coluna === coluna.id ? (
                      ordenacao.desc ? (
                        <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUp className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((c) => {
              const expandida = expandidas.has(c.id);
              const linkAnimais = `/${localId}/animais?especie=${c.especie}&categoria=${c.id}`;
              return (
                <Fragment key={c.id}>
                  <TableRow
                    className={c.porArea.length > 0 ? "cursor-pointer" : undefined}
                    onClick={() => c.porArea.length > 0 && alternarExpandida(c.id)}
                  >
                    <TableCell>
                      {c.porArea.length > 0 &&
                        (expandida ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        ))}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={linkAnimais}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline"
                      >
                        {c.descricao}
                      </Link>
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", c.total === 0 && "text-muted-foreground")}>
                      {c.total}
                    </TableCell>
                  </TableRow>
                  {expandida && c.porArea.length > 0 && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell />
                      <TableCell colSpan={2}>
                        <div className="flex flex-col gap-1 py-1">
                          {c.porArea.map((a) => (
                            <Link
                              key={a.area_nome}
                              href={linkAnimais}
                              className="flex items-center justify-between gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
                            >
                              <span className="flex items-center gap-1.5">
                                <MapPin className="size-3.5 shrink-0" />
                                {a.area_nome}
                              </span>
                              <span className="tabular-nums">{a.total}</span>
                            </Link>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell />
              <TableCell className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "categoria" : "categorias"}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{totalGeral}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </div>
  );
}
