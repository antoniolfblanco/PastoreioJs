"use client";

import { useMemo, useState } from "react";
import { Undo2, Skull, ArrowUp, ArrowDown, ArrowUpDown, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { desfazerUltimaMorte } from "@/lib/actions/mortes";
import { gerarPdfMortes } from "@/lib/relatorios-pdf";
import { DialogoMorte } from "./dialogo-morte";
import type { Especie, GrupoMorte, OpcaoEnfermidade } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type ColunaId = "data" | "descricao" | "quantidade" | "causa" | "tratada";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
  { id: "causa", rotulo: "Causa" },
  { id: "tratada", rotulo: "Tratada" },
];

function valorOrdenacao(g: GrupoMorte, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return g.data;
    case "descricao":
      return (g.descricao ?? "").toLowerCase();
    case "quantidade":
      return g.animais.length;
    case "causa":
      return (g.enfermidade_descricao ?? "").toLowerCase();
    case "tratada":
      return g.tratada ? 0 : 1;
  }
}

type Props = {
  localId: string;
  localNome: string;
  grupos: GrupoMorte[];
  enfermidades: OpcaoEnfermidade[];
  podeEditar: boolean;
};

export function TabelaMortes({ localId, localNome, grupos, enfermidades, podeEditar }: Props) {
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [causasFiltro, setCausasFiltro] = useState<Set<string>>(new Set());
  const [tratadaFiltro, setTratadaFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);

  const grupoMaisRecenteId = useMemo(() => {
    if (grupos.length === 0) return null;
    return grupos.reduce((mais, atual) => (atual.criado_em > mais.criado_em ? atual : mais)).ocorrencia_grupo_id;
  }, [grupos]);

  const causasDisponiveis = useMemo(
    () => Array.from(new Set(grupos.map((g) => g.enfermidade_descricao).filter((c): c is string => !!c))).sort(),
    [grupos],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const filtrados = grupos.filter((g) => {
      if (especiesFiltro.size > 0 && !especiesFiltro.has(g.especie)) return false;
      if (causasFiltro.size > 0 && (!g.enfermidade_descricao || !causasFiltro.has(g.enfermidade_descricao)))
        return false;
      if (tratadaFiltro.size > 0 && !tratadaFiltro.has(g.tratada ? "sim" : "nao")) return false;
      return true;
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [grupos, especiesFiltro, causasFiltro, tratadaFiltro, ordenacao]);

  const totalAnimais = useMemo(() => dados.reduce((soma, g) => soma + g.animais.length, 0), [dados]);
  const indiceQuantidade = colunas.findIndex((c) => c.id === "quantidade");

  const selecionado =
    selecionadoId === null ? null : (grupos.find((g) => g.ocorrencia_grupo_id === selecionadoId) ?? null);

  // Resumos no mesmo recorte da tabela (respeitam os filtros), contando animal
  // por animal — um registro de 5 cabeças conta 5.
  const porCategoria = useMemo(
    () => contar(dados.flatMap((g) => g.animais.map((a) => a.categoria_descricao))),
    [dados],
  );
  const porCausa = useMemo(
    () => contar(dados.flatMap((g) => g.animais.map(() => g.enfermidade_descricao ?? "Não informada"))),
    [dados],
  );

  const [gerandoPdf, setGerandoPdf] = useState(false);

  // PDF do que a tela mostra agora (mesmos filtros e ordem), como no app.
  async function pdf() {
    setGerandoPdf(true);
    try {
      const filtros = [
        especiesFiltro.size > 0 && Array.from(especiesFiltro).map((e) => rotulosEspecie[e as Especie]).join(", "),
        causasFiltro.size > 0 && "Causas: " + Array.from(causasFiltro).join(", "),
        tratadaFiltro.size === 1 && (tratadaFiltro.has("sim") ? "Só tratadas" : "Só não tratadas"),
      ].filter(Boolean);
      await gerarPdfMortes(
        localNome,
        filtros.length ? filtros.join(" - ") : "Todos os registros",
        dados.map((g) => {
          const categorias = contar(g.animais.map((a) => a.categoria_descricao));
          const areas = Array.from(new Set(g.animais.map((a) => a.area_nome ?? "Sem área")));
          return {
            data: g.data,
            quantidade: g.animais.length,
            categoria:
              categorias.length === 1 ? categorias[0][0] : categorias.map(([c, n]) => `${n} ${c}`).join(", "),
            causa: g.enfermidade_descricao ?? "Não informada",
            area: areas.length === 1 ? areas[0] : "Várias áreas",
            responsavel: g.responsavel,
            tratada: g.tratada,
            observacoes: [g.descricao, g.observacoes].filter(Boolean).join(" - ") || null,
          };
        }),
        porCategoria.map(([rotulo, quantidade]) => ({ rotulo, quantidade })),
        porCausa.map(([rotulo, quantidade]) => ({ rotulo, quantidade })),
      );
    } catch (e) {
      alert("Não foi possível gerar o PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGerandoPdf(false);
    }
  }

  async function desfazer() {
    if (!confirm("Desfazer o registro de morte mais recente? Os animais voltam a ficar ativos.")) return;
    setDesfazendo(true);
    try {
      const resultado = await desfazerUltimaMorte(localId);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível desfazer.");
    } finally {
      setDesfazendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Mortes</h1>
        <p className="text-sm text-muted-foreground">Registros de perda do rebanho.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FiltroMultiSelecao
          rotulo="Todas as espécies"
          className="w-full md:w-auto"
          selecionados={especiesFiltro}
          onChange={setEspeciesFiltro}
          opcoes={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as causas"
          className="w-full md:w-auto"
          selecionados={causasFiltro}
          onChange={setCausasFiltro}
          opcoes={causasDisponiveis.map((c) => ({ value: c, label: c }))}
        />
        <FiltroMultiSelecao
          rotulo="Tratada?"
          className="w-full md:w-auto"
          selecionados={tratadaFiltro}
          onChange={setTratadaFiltro}
          opcoes={[
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" },
          ]}
        />
        <span className="text-sm text-muted-foreground">{dados.length} registro(s)</span>
        <Button variant="outline" size="sm" className="md:ml-auto" disabled={gerandoPdf} onClick={pdf}>
          <FileDown className="size-4" />
          {gerandoPdf ? "Gerando..." : "Gerar PDF"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TabelaResumo titulo="Mortes por categoria" linhas={porCategoria} />
        <TabelaResumo titulo="Mortes por causa" linhas={porCausa} />
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Skull className="size-8" />
          <p>Nenhum registro de morte encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
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
              {podeEditar && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((g) => (
              <TableRow
                key={g.ocorrencia_grupo_id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(g.ocorrencia_grupo_id)}
                title={g.animais.length > 0 ? `Animais: ${g.animais.map((a) => a.brinco ?? a.nome ?? a.tatuagem ?? "—").join(", ")}` : undefined}
              >
                <TableCell className="font-medium">{formatarData(g.data)}</TableCell>
                <TableCell>{g.descricao ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{g.animais.length}</TableCell>
                <TableCell>{g.enfermidade_descricao ?? "—"}</TableCell>
                <TableCell>
                  {g.tratada === null ? "—" : <Badge variant={g.tratada ? "secondary" : "outline"}>{g.tratada ? "Sim" : "Não"}</Badge>}
                </TableCell>
                {podeEditar && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {g.ocorrencia_grupo_id === grupoMaisRecenteId && (
                      <Button variant="ghost" size="sm" disabled={desfazendo} onClick={desfazer}>
                        <Undo2 className="size-4" />
                        Desfazer
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "registro" : "registros"}
              </TableCell>
              <TableCell colSpan={indiceQuantidade - 1} className="text-right font-medium">
                Total de animais
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{totalAnimais}</TableCell>
              <TableCell colSpan={colunas.length - indiceQuantidade - 1} />
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoMorte
          key={selecionadoId ?? "fechado"}
          localId={localId}
          grupo={selecionado}
          enfermidades={enfermidades}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}
