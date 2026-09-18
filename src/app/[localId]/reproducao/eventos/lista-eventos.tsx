"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, CalendarClock, Repeat, ChevronDown, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { apagarEventoReprodutivo, buscarResumoEventoParaExclusao } from "@/lib/actions/eventos-reprodutivos";
import { DialogoApagarReprodutivo, type ResumoExclusaoReprodutiva } from "../_componentes/dialogo-apagar-reprodutivo";
import { DialogoEvento, type EventoParaEditar } from "./dialogo-evento";
import type { Especie, Estacao, Evento, FemeaDoEvento, Metodo } from "./page";

const especies: { value: Especie; rotulo: string }[] = [
  { value: "bovino", rotulo: "Bovinos" },
  { value: "ovino", rotulo: "Ovinos" },
  { value: "equino", rotulo: "Equinos" },
];

const rotulosMetodo: Record<Metodo, string> = {
  monta_natural: "Monta natural",
  inseminacao_artificial: "Inseminação artificial",
  te_fiv: "TE/FIV",
};

const rotulosDiagnostico: Record<string, string> = {
  prenha: "Prenha",
  vazia: "Vazia",
  inconclusivo: "Inconclusivo",
};

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

function formatarPercentual(parte: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((parte / total) * 100)}%`;
}

function resumoDeFemeas(femeas: FemeaDoEvento[]) {
  let diagnosticadas = 0;
  let prenhes = 0;
  let vazias = 0;
  let inconclusivos = 0;
  for (const f of femeas) {
    if (!f.ultimoDiagnosticoResultado) continue;
    diagnosticadas++;
    if (f.ultimoDiagnosticoResultado === "prenha") prenhes++;
    else if (f.ultimoDiagnosticoResultado === "vazia") vazias++;
    else if (f.ultimoDiagnosticoResultado === "inconclusivo") inconclusivos++;
  }
  return { total: femeas.length, diagnosticadas, prenhes, vazias, inconclusivos };
}

type Props = {
  localId: string;
  estacoes: Estacao[];
  eventos: Evento[];
  femeasPorEvento: Record<string, FemeaDoEvento[]>;
  podeEditar: boolean;
  estacaoInicialId?: string;
};

export function ListaEventos({ localId, estacoes, eventos, femeasPorEvento, podeEditar, estacaoInicialId }: Props) {
  const estacaoLinkada = useMemo(
    () => (estacaoInicialId ? (estacoes.find((e) => e.id === estacaoInicialId) ?? null) : null),
    [estacoes, estacaoInicialId],
  );
  const [especieSelecionada, setEspecieSelecionada] = useState<Especie>(estacaoLinkada?.especie ?? "bovino");
  // Enquanto não nulo, mostra essa estação específica (mesmo encerrada) em
  // vez da estação ativa da espécie — é o que o link do card de Estação
  // Reprodutiva usa pra abrir aqui já filtrado.
  const [estacaoFixadaId, setEstacaoFixadaId] = useState<string | null>(estacaoInicialId ?? null);
  const [alvo, setAlvo] = useState<EventoParaEditar | "novo" | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [apagando, setApagando] = useState<{ evento: Evento; resumo: ResumoExclusaoReprodutiva } | null>(null);
  const [apagandoEmAndamento, setApagandoEmAndamento] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  function trocarEspecie(nova: Especie) {
    setEspecieSelecionada(nova);
    setEstacaoFixadaId(null);
  }

  const estacaoAtiva = useMemo(() => {
    if (estacaoFixadaId) return estacoes.find((e) => e.id === estacaoFixadaId) ?? null;
    return (
      estacoes.find((e) => e.ativo && e.especie === especieSelecionada) ??
      estacoes.find((e) => e.ativo && e.especie === null) ??
      null
    );
  }, [estacoes, especieSelecionada, estacaoFixadaId]);

  const eventosDaEstacao = useMemo(
    () => (estacaoAtiva ? eventos.filter((ev) => ev.estacao_id === estacaoAtiva.id) : []),
    [eventos, estacaoAtiva],
  );

  function alternarExpandido(id: string) {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function abrirEdicao(evento: Evento) {
    setCarregandoId(evento.id);
    try {
      const resumo = await buscarResumoEventoParaExclusao(evento.id);
      if ("error" in resumo) {
        alert(resumo.error);
        return;
      }
      setAlvo({ evento, temCobertura: resumo.coberturas > 0 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível carregar o evento.");
    } finally {
      setCarregandoId(null);
    }
  }

  async function abrirExclusao(evento: Evento) {
    setCarregandoId(evento.id);
    try {
      const resumo = await buscarResumoEventoParaExclusao(evento.id);
      if ("error" in resumo) {
        alert(resumo.error);
        return;
      }
      setApagando({ evento, resumo });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível carregar o evento.");
    } finally {
      setCarregandoId(null);
    }
  }

  async function confirmarExclusao() {
    if (!apagando) return;
    setApagandoEmAndamento(true);
    try {
      const resultado = await apagarEventoReprodutivo(localId, apagando.evento.id);
      if (resultado.error) {
        alert(resultado.error);
        return;
      }
      setApagando(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setApagandoEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Eventos Reprodutivos</h1>
          <p className="text-sm text-muted-foreground">
            Cada evento (ex.: &quot;IATF Lote 1&quot;) agrupa as fêmeas que vão participar da mesma rodada de
            cobertura — clique no nome pra gerenciar as participantes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {especies.map((e) => (
            <button
              key={e.value}
              onClick={() => trocarEspecie(e.value)}
              className={cn(
                buttonVariants({ variant: especieSelecionada === e.value ? "secondary" : "ghost", size: "sm" }),
              )}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
      </div>

      {!estacaoAtiva ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <Repeat className="size-8" />
          <p className="max-w-sm text-sm">
            Nenhuma estação reprodutiva ativa de {especies.find((e) => e.value === especieSelecionada)?.rotulo.toLowerCase()}.
            Abra uma estação antes de criar eventos.
          </p>
          <Link href={`/${localId}/reproducao/estacoes`} className={buttonVariants({ size: "sm" })}>
            Ir para Estação Reprodutiva
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {estacaoFixadaId ? "Estação" : "Estação ativa"}:{" "}
              <span className="font-medium text-foreground">{estacaoAtiva.nome}</span>
              {estacaoFixadaId && !estacaoAtiva.ativo && " (encerrada)"}
            </p>
            {podeEditar && (
              <Button size="sm" onClick={() => setAlvo("novo")}>
                <Plus className="size-4" />
                Novo evento
              </Button>
            )}
          </div>

          {eventosDaEstacao.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              <CalendarClock className="size-8" />
              <p>Nenhum evento criado nesta estação ainda.</p>
              <p className="max-w-sm text-sm">
                Ex.: &quot;IATF Lote 1&quot; — um evento agrupa as fêmeas que vão participar da mesma rodada de
                cobertura.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {eventosDaEstacao.map((ev) => {
                const femeas = femeasPorEvento[ev.id] ?? [];
                const resumo = resumoDeFemeas(femeas);
                const isTeFiv = ev.metodo === "te_fiv";
                const expandido = expandidos.has(ev.id);
                return (
                  <div key={ev.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/${localId}/reproducao/eventos/${ev.id}`}
                          className="font-medium hover:underline"
                        >
                          {ev.nome}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {rotulosMetodo[ev.metodo]} — início em {formatarData(ev.data_inicio)}
                        </p>
                      </div>
                      {podeEditar && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="Editar"
                            disabled={carregandoId === ev.id}
                            onClick={() => abrirEdicao(ev)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            title="Apagar"
                            disabled={carregandoId === ev.id}
                            onClick={() => abrirExclusao(ev)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
                      <span>{isTeFiv ? `Embriões transferidos: ${resumo.total}` : `Vacas acasaladas: ${resumo.total}`}</span>
                      <span>
                        Diagnosticadas: {resumo.diagnosticadas} ({formatarPercentual(resumo.diagnosticadas, resumo.total)})
                      </span>
                      <span>Prenhes: {resumo.prenhes}</span>
                      <span>Vazias: {resumo.vazias}</span>
                      <span>Inconclusivos: {resumo.inconclusivos}</span>
                    </div>

                    {femeas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => alternarExpandido(ev.id)}
                        className="mt-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        {expandido ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        {expandido ? "Ocultar fêmeas" : "Ver fêmeas"}
                      </button>
                    )}

                    {expandido && femeas.length > 0 && (
                      <Table className="mt-2">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fêmea</TableHead>
                            <TableHead>{isTeFiv ? "Embrião" : "Acasalamento"}</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Data diagnóstico</TableHead>
                            <TableHead>Diagnóstico</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {femeas.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell className="font-medium">{f.identificacao}</TableCell>
                              <TableCell>{f.acasalamento ?? (f.confirmada ? "—" : "Pendente")}</TableCell>
                              <TableCell>{formatarData(f.data)}</TableCell>
                              <TableCell>{formatarData(f.ultimoDiagnosticoData)}</TableCell>
                              <TableCell>
                                {f.pariu ? (
                                  <Badge variant="secondary">Pariu</Badge>
                                ) : f.ultimoDiagnosticoResultado ? (
                                  <Badge variant={f.ultimoDiagnosticoResultado === "prenha" ? "secondary" : "outline"}>
                                    {rotulosDiagnostico[f.ultimoDiagnosticoResultado]}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {podeEditar && (
        <DialogoEvento
          key={alvo === "novo" ? "novo" : alvo === null ? "fechado" : alvo.evento.id}
          localId={localId}
          estacaoId={estacaoAtiva?.id ?? null}
          especieInicial={especieSelecionada}
          alvo={alvo}
          onFechar={() => setAlvo(null)}
        />
      )}

      <DialogoApagarReprodutivo
        titulo="Apagar este evento?"
        nome={apagando?.evento.nome ?? ""}
        resumo={apagando?.resumo ?? null}
        emAndamento={apagandoEmAndamento}
        onConfirmar={confirmarExclusao}
        onFechar={() => setApagando(null)}
      />
    </div>
  );
}
