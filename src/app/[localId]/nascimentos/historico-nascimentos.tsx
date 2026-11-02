"use client";

import { Fragment, useMemo, useState } from "react";
import { Baby, ChevronDown, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { TabelaResumo, contar } from "@/components/tabela-resumo";
import { cn } from "@/lib/utils";
import type { CicloAtivo, Nascido, OpcaoArea } from "./page";

const rotulosEspecie: Record<string, string> = { bovino: "Bovinos", ovino: "Ovinos", equino: "Equinos" };
const rotulosSexo: Record<string, string> = { macho: "Macho", femea: "Fêmea", desconhecido: "—" };
const rotulosSituacao: Record<string, string> = {
  ativo: "Ativo",
  morto: "Morto",
  vendido: "Vendido",
  consumido: "Consumido",
  furtado: "Furtado",
  transferido: "Transferido",
  ajustado: "Ajustado",
};

export function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

export function formatarKg(peso: number | null) {
  return peso != null ? `${peso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg` : "—";
}

export function identificacaoNascido(a: { nome: string | null; brinco: string | null; tatuagem: string | null }) {
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

// Sem identificação nem genealogia nem peso = veio de um lançamento em lote.
function ehDeLote(a: Nascido) {
  return !a.brinco && !a.tatuagem && !a.nome && !a.mae && !a.pai && a.peso_nascimento == null;
}

type Linha = { chave: string; animais: Nascido[]; lote: boolean };

// Os animais de um mesmo lote foram gravados no mesmo insert — mesmo
// criado_em, área e categoria — e viram uma linha só no histórico.
function agrupar(nascidos: Nascido[]): Linha[] {
  const linhas: Linha[] = [];
  const lotes = new Map<string, Linha>();
  for (const a of nascidos) {
    if (!ehDeLote(a)) {
      linhas.push({ chave: a.id, animais: [a], lote: false });
      continue;
    }
    const chave = `${a.criado_em}|${a.area_id}|${a.categoria_descricao}|${a.data_nascimento}`;
    const existente = lotes.get(chave);
    if (existente) existente.animais.push(a);
    else {
      const linha = { chave, animais: [a], lote: true };
      lotes.set(chave, linha);
      linhas.push(linha);
    }
  }
  return linhas;
}

type Periodo = "ciclo" | "12meses" | "todos";

export function HistoricoNascimentos({
  nascidos,
  areas,
  ciclo,
}: {
  nascidos: Nascido[];
  areas: OpcaoArea[];
  ciclo: CicloAtivo;
}) {
  const [periodo, setPeriodo] = useState<Periodo>(ciclo ? "ciclo" : "12meses");
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [areasFiltro, setAreasFiltro] = useState<Set<string>>(new Set());
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  const filtrados = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    const inicio =
      periodo === "ciclo" && ciclo
        ? ciclo.data_inicio
        : periodo === "12meses"
          ? umAnoAtras.toISOString().slice(0, 10)
          : null;
    const fim = periodo === "ciclo" && ciclo ? (ciclo.data_fim ?? hoje) : null;
    return nascidos.filter((a) => {
      if (especiesFiltro.size > 0 && !especiesFiltro.has(a.especie)) return false;
      if (areasFiltro.size > 0 && !areasFiltro.has(a.area_id)) return false;
      if (inicio && (!a.data_nascimento || a.data_nascimento < inicio)) return false;
      if (fim && a.data_nascimento && a.data_nascimento > fim) return false;
      return true;
    });
  }, [nascidos, periodo, ciclo, especiesFiltro, areasFiltro]);

  const linhas = useMemo(
    () =>
      agrupar(filtrados).sort((a, b) =>
        (b.animais[0].data_nascimento ?? "").localeCompare(a.animais[0].data_nascimento ?? ""),
      ),
    [filtrados],
  );

  const resumo = useMemo(() => {
    const comPeso = filtrados.filter((a) => a.peso_nascimento != null);
    return {
      total: filtrados.length,
      machos: filtrados.filter((a) => a.sexo === "macho").length,
      femeas: filtrados.filter((a) => a.sexo === "femea").length,
      pesoMedio: comPeso.length ? comPeso.reduce((s, a) => s + a.peso_nascimento!, 0) / comPeso.length : null,
      porCategoria: contar(filtrados.map((a) => a.categoria_descricao)),
      porArea: contar(filtrados.map((a) => a.area_nome)),
    };
  }, [filtrados]);

  function alternar(chave: string) {
    setAbertas((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  const periodos: { id: Periodo; rotulo: string }[] = [
    ...(ciclo ? [{ id: "ciclo" as const, rotulo: `Ciclo ${ciclo.nome}` }] : []),
    { id: "12meses", rotulo: "Últimos 12 meses" },
    { id: "todos", rotulo: "Todos" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Nascimentos</h1>
        <p className="text-sm text-muted-foreground">Animais que entraram no rebanho por nascimento.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {periodos.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={cn(buttonVariants({ variant: periodo === p.id ? "secondary" : "ghost", size: "sm" }))}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <FiltroMultiSelecao
          rotulo="Todas as espécies"
          className="w-full md:w-auto"
          selecionados={especiesFiltro}
          onChange={setEspeciesFiltro}
          opcoes={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as áreas"
          className="w-full md:w-auto"
          selecionados={areasFiltro}
          onChange={setAreasFiltro}
          opcoes={areas.map((a) => ({ value: a.id, label: a.nome }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { rotulo: "Nascimentos", valor: String(resumo.total) },
          { rotulo: "Machos", valor: String(resumo.machos) },
          { rotulo: "Fêmeas", valor: String(resumo.femeas) },
          { rotulo: "Peso médio ao nascer", valor: formatarKg(resumo.pesoMedio) },
        ].map((r) => (
          <div key={r.rotulo} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{r.rotulo}</div>
            <div className="text-lg font-semibold tabular-nums">{r.valor}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TabelaResumo titulo="Nascimentos por categoria" linhas={resumo.porCategoria} />
        <TabelaResumo titulo="Nascimentos por área" linhas={resumo.porArea} />
      </div>

      {linhas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Baby className="size-8" />
          <p>Nenhum nascimento no período.</p>
        </div>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Animal</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Mãe</TableHead>
                <TableHead>Pai</TableHead>
                <TableHead className="text-right">Peso ao nascer</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const a = l.animais[0];
                if (!l.lote || l.animais.length === 1) {
                  return (
                    <TableRow key={l.chave}>
                      <TableCell>{formatarData(a.data_nascimento)}</TableCell>
                      <TableCell className="font-medium">
                        {identificacaoNascido(a)}
                        {a.receptora && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            Embrião · receptora {a.receptora}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {a.categoria_descricao}
                        <span className="block text-xs text-muted-foreground">{rotulosSexo[a.sexo]}</span>
                      </TableCell>
                      <TableCell>{a.area_nome}</TableCell>
                      <TableCell>{a.mae ?? "—"}</TableCell>
                      <TableCell>{a.pai ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatarKg(a.peso_nascimento)}</TableCell>
                      <TableCell>
                        <Badge variant={a.situacao === "ativo" ? "secondary" : "outline"}>
                          {rotulosSituacao[a.situacao] ?? a.situacao}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                }
                const aberta = abertas.has(l.chave);
                const ativos = l.animais.filter((x) => x.situacao === "ativo").length;
                return (
                  <Fragment key={l.chave}>
                    <TableRow className="cursor-pointer bg-muted/30" onClick={() => alternar(l.chave)}>
                      <TableCell>{formatarData(a.data_nascimento)}</TableCell>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1">
                          {aberta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          Lote · {l.animais.length} animais
                        </span>
                      </TableCell>
                      <TableCell>
                        {a.categoria_descricao}
                        <span className="block text-xs text-muted-foreground">{rotulosSexo[a.sexo]}</span>
                      </TableCell>
                      <TableCell>{a.area_nome}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ativos} de {l.animais.length} ativos
                      </TableCell>
                    </TableRow>
                    {aberta &&
                      l.animais.map((x, i) => (
                        <TableRow key={x.id} className="text-muted-foreground">
                          <TableCell />
                          <TableCell className="pl-8">Animal {i + 1}</TableCell>
                          <TableCell colSpan={5} />
                          <TableCell>{rotulosSituacao[x.situacao] ?? x.situacao}</TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
