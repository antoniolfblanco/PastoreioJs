"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { TabelaResumo, contar } from "@/components/tabela-resumo";
import { CartoesResumo, usePeriodo, type CicloPeriodo } from "@/components/filtro-periodo";
import { identificacaoAnimal } from "@/components/card-selecao-animais";
import type { Direcao, StatusTransferencia, Transferencia } from "./page";

const rotulosEspecie: Record<string, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };
const rotulosDirecao: Record<Direcao, string> = { enviada: "Enviada", recebida: "Recebida" };
const rotulosStatus: Record<StatusTransferencia, string> = {
  pendente: "Pendente",
  confirmada: "Concluída",
  recusada: "Recusada",
};

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function reais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function valorTotal(t: Transferencia) {
  const comValor = t.animais.filter((a) => a.valor != null);
  return comValor.length ? comValor.reduce((s, a) => s + a.valor!, 0) : null;
}

type ColunaId = "data" | "direcao" | "outro" | "descricao" | "quantidade" | "valor" | "status";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "direcao", rotulo: "Tipo" },
  { id: "outro", rotulo: "Propriedade" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Animais", alinhamento: "right" },
  { id: "valor", rotulo: "Valor", alinhamento: "right" },
  { id: "status", rotulo: "Situação" },
];

function valorOrdenacao(t: Transferencia, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return t.data;
    case "direcao":
      return t.direcao;
    case "outro":
      return t.outroNome.toLowerCase();
    case "descricao":
      return (t.descricao ?? "").toLowerCase();
    case "quantidade":
      return t.animais.length;
    case "valor":
      return valorTotal(t) ?? -Infinity;
    case "status":
      return t.status;
  }
}

export function HistoricoTransferencias({
  transferencias,
  ciclo,
  localCodigo,
}: {
  transferencias: Transferencia[];
  ciclo: CicloPeriodo;
  localCodigo: string;
}) {
  const { dentro, seletor } = usePeriodo(ciclo);
  const [direcoesFiltro, setDirecoesFiltro] = useState<Set<string>>(new Set());
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [statusFiltro, setStatusFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  function alternar(id: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const dados = useMemo(() => {
    const filtrados = transferencias.filter(
      (t) =>
        dentro(t.data) &&
        (direcoesFiltro.size === 0 || direcoesFiltro.has(t.direcao)) &&
        (especiesFiltro.size === 0 || (t.especie && especiesFiltro.has(t.especie))) &&
        (statusFiltro.size === 0 || statusFiltro.has(t.status)),
    );
    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [transferencias, dentro, direcoesFiltro, especiesFiltro, statusFiltro, ordenacao]);

  // Resumos só com o que efetivamente saiu/entrou (recusadas não contam).
  const resumo = useMemo(() => {
    const valem = dados.filter((t) => t.status !== "recusada");
    const enviados = valem.filter((t) => t.direcao === "enviada").flatMap((t) => t.animais);
    const recebidos = valem.filter((t) => t.direcao === "recebida" && t.status === "confirmada").flatMap((t) => t.animais);
    return {
      enviados: enviados.length,
      recebidos: recebidos.length,
      pendentes: dados.filter((t) => t.status === "pendente").length,
      enviadosPorCategoria: contar(enviados.map((a) => a.categoria_descricao)),
      recebidosPorCategoria: contar(recebidos.map((a) => a.categoria_descricao)),
      porPropriedade: contar(valem.flatMap((t) => t.animais.map(() => `${t.outroNome} (${t.direcao === "enviada" ? "enviados" : "recebidos"})`))),
    };
  }, [dados]);
  const saldo = resumo.recebidos - resumo.enviados;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Transferências</h1>
        <p className="text-sm text-muted-foreground">
          Animais que saem para outra propriedade ou chegam dela sem compra e venda. O código desta propriedade, para
          receber de outras fazendas do sistema, é <span className="font-mono font-medium">{localCodigo}</span>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {seletor}
        <FiltroMultiSelecao
          rotulo="Enviadas e recebidas"
          className="w-full md:w-auto"
          selecionados={direcoesFiltro}
          onChange={setDirecoesFiltro}
          opcoes={Object.entries(rotulosDirecao).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as espécies"
          className="w-full md:w-auto"
          selecionados={especiesFiltro}
          onChange={setEspeciesFiltro}
          opcoes={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as situações"
          className="w-full md:w-auto"
          selecionados={statusFiltro}
          onChange={setStatusFiltro}
          opcoes={Object.entries(rotulosStatus).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <CartoesResumo
        itens={[
          { rotulo: "Animais enviados", valor: resumo.enviados },
          { rotulo: "Animais recebidos", valor: resumo.recebidos },
          { rotulo: "Saldo", valor: `${saldo > 0 ? "+" : ""}${saldo}` },
          { rotulo: "Pendentes", valor: resumo.pendentes },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TabelaResumo titulo="Enviados por categoria" linhas={resumo.enviadosPorCategoria} />
        <TabelaResumo titulo="Recebidos por categoria" linhas={resumo.recebidosPorCategoria} />
        <TabelaResumo titulo="Por propriedade" linhas={resumo.porPropriedade} />
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <ArrowLeftRight className="size-8" />
          <p>Nenhuma transferência no período.</p>
        </div>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
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
              {dados.map((t) => {
                const aberto = abertos.has(t.id);
                const total = valorTotal(t);
                return (
                  <Fragment key={t.id}>
                    <TableRow className="cursor-pointer" onClick={() => alternar(t.id)}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1">
                          {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          {formatarData(t.data)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.direcao === "recebida" ? "secondary" : "outline"}>{rotulosDirecao[t.direcao]}</Badge>
                      </TableCell>
                      <TableCell>
                        {t.outroNome}
                        {t.externa && <span className="ml-1 text-xs text-muted-foreground">(fora do sistema)</span>}
                      </TableCell>
                      <TableCell>{t.descricao ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.animais.length}</TableCell>
                      <TableCell className="text-right tabular-nums">{total != null ? reais(total) : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={t.status === "pendente" ? "default" : t.status === "recusada" ? "destructive" : "outline"}
                        >
                          {rotulosStatus[t.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {aberto && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={colunas.length} className="bg-muted/30">
                          <div className="flex flex-col gap-1 pl-5 text-sm text-muted-foreground">
                            {[
                              t.responsavel && `Responsável: ${t.responsavel}`,
                              t.observacoes && `Observações: ${t.observacoes}`,
                              t.motivo_recusa && `Motivo da recusa: ${t.motivo_recusa}`,
                            ]
                              .filter(Boolean)
                              .map((linha) => (
                                <span key={linha as string}>{linha}</span>
                              ))}
                            <span>
                              {t.animais
                                .map(
                                  (a) =>
                                    `${identificacaoAnimal(a)} (${a.categoria_descricao}${
                                      a.valor != null ? `, ${reais(a.valor)}` : ""
                                    })`,
                                )
                                .join(", ")}
                            </span>
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
                <TableCell colSpan={3} className="text-sm font-normal text-muted-foreground">
                  {dados.length} {dados.length === 1 ? "transferência" : "transferências"}
                </TableCell>
                <TableCell className="text-right font-medium">Total</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {dados.reduce((s, t) => s + t.animais.length, 0)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}
