"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CicloPeriodo = { nome: string; data_inicio: string; data_fim: string | null } | null;
type Periodo = "ciclo" | "12meses" | "todos";

// Filtro de período dos históricos: ciclo ativo (padrão quando existe),
// últimos 12 meses ou tudo. `dentro(data)` diz se uma data "aaaa-mm-dd" cai
// no período escolhido.
export function usePeriodo(ciclo: CicloPeriodo) {
  const [periodo, setPeriodo] = useState<Periodo>(ciclo ? "ciclo" : "12meses");

  const hoje = new Date().toISOString().slice(0, 10);
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  const inicio =
    periodo === "ciclo" && ciclo ? ciclo.data_inicio : periodo === "12meses" ? umAnoAtras.toISOString().slice(0, 10) : null;
  const fim = periodo === "ciclo" && ciclo ? (ciclo.data_fim ?? hoje) : null;

  function dentro(data: string) {
    return (!inicio || data >= inicio) && (!fim || data <= fim);
  }

  const opcoes: { id: Periodo; rotulo: string }[] = [
    ...(ciclo ? [{ id: "ciclo" as const, rotulo: `Ciclo ${ciclo.nome}` }] : []),
    { id: "12meses", rotulo: "Últimos 12 meses" },
    { id: "todos", rotulo: "Todos" },
  ];

  const seletor = (
    <div className="flex flex-wrap items-center gap-1">
      {opcoes.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPeriodo(p.id)}
          className={cn(buttonVariants({ variant: periodo === p.id ? "secondary" : "ghost", size: "sm" }))}
        >
          {p.rotulo}
        </button>
      ))}
    </div>
  );

  return { periodo, dentro, seletor };
}

// Cartões de número no topo dos históricos.
export function CartoesResumo({ itens }: { itens: { rotulo: string; valor: string | number }[] }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", itens.length > 2 && "md:grid-cols-4")}>
      {itens.map((r) => (
        <div key={r.rotulo} className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">{r.rotulo}</div>
          <div className="text-lg font-semibold tabular-nums">{r.valor}</div>
        </div>
      ))}
    </div>
  );
}
