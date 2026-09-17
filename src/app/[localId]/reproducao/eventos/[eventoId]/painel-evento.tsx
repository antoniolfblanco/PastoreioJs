"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  adicionarReceptorasEvento,
  confirmarAcasalamentoEmbriao,
  confirmarAcasalamentos,
  desfazerAcasalamento,
  registrarDiagnosticosGestacao,
  removerParticipante,
} from "@/lib/actions/coberturas";
import { SeletorAnimalEvento } from "./seletor-animal-evento";
import { DialogoAdicionarDosesSemen } from "./dialogo-adicionar-doses-semen";
import { DialogoAdicionarParticipantes } from "./dialogo-adicionar-participantes";
import { DialogoConfirmarAcasalamento } from "./dialogo-confirmar-acasalamento";
import { DialogoConfirmarAcasalamentoEmbriao } from "./dialogo-confirmar-acasalamento-embriao";
import { DialogoDiagnostico } from "./dialogo-diagnostico";
import type {
  CandidatoAnimal,
  CertezaDiagnostico,
  Evento,
  LoteEmbriaoOpcao,
  LoteRmOpcao,
  Participante,
  ResultadoDiagnostico,
} from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

const rotulosMetodo: Record<Evento["metodo"], string> = {
  monta_natural: "Monta natural",
  inseminacao_artificial: "Inseminação artificial",
  te_fiv: "TE/FIV",
};

const rotulosDiagnostico: Record<string, string> = {
  prenha: "Prenha",
  vazia: "Vazia",
  inconclusivo: "Inconclusivo",
};

const resultados: { value: ResultadoDiagnostico; rotulo: string }[] = [
  { value: "prenha", rotulo: "Prenha" },
  { value: "vazia", rotulo: "Vazia" },
  { value: "inconclusivo", rotulo: "Inconclusivo" },
];

const certezas: { value: CertezaDiagnostico; rotulo: string }[] = [
  { value: "certo", rotulo: "Certo" },
  { value: "provavel", rotulo: "Provável" },
];

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

function formatarPercentual(parte: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((parte / total) * 100)}%`;
}

function resumoDeParticipantes(participantes: Participante[]) {
  let diagnosticadas = 0;
  let prenhes = 0;
  let vazias = 0;
  let inconclusivos = 0;
  for (const p of participantes) {
    if (!p.ultimoDiagnosticoResultado) continue;
    diagnosticadas++;
    if (p.ultimoDiagnosticoResultado === "prenha") prenhes++;
    else if (p.ultimoDiagnosticoResultado === "vazia") vazias++;
    else if (p.ultimoDiagnosticoResultado === "inconclusivo") inconclusivos++;
  }
  return { total: participantes.length, diagnosticadas, prenhes, vazias, inconclusivos };
}

type Props = {
  localId: string;
  evento: Evento;
  participantes: Participante[];
  candidatos: CandidatoAnimal[];
  lotesRm: LoteRmOpcao[];
  lotesEmbriao: LoteEmbriaoOpcao[];
  podeEditar: boolean;
};

export function PainelEvento({ localId, evento, participantes, candidatos, lotesRm, lotesEmbriao, podeEditar }: Props) {
  const isTeFiv = evento.metodo === "te_fiv";
  const isIa = evento.metodo === "inseminacao_artificial";
  const resumo = useMemo(() => resumoDeParticipantes(participantes), [participantes]);
  const jaParticipantes = useMemo(() => new Set(participantes.map((p) => p.femeaId)), [participantes]);

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [adicionandoAberto, setAdicionandoAberto] = useState(false);
  const [confirmandoIds, setConfirmandoIds] = useState<string[] | null>(null);
  const [confirmandoEmbriaoIds, setConfirmandoEmbriaoIds] = useState<string[] | null>(null);
  const [diagnosticando, setDiagnosticando] = useState<Participante[] | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [linhaEmAndamento, setLinhaEmAndamento] = useState<string | null>(null);
  const [dosesRapidoAberto, setDosesRapidoAberto] = useState(false);
  const [dataAcasalamentoPorLinha, setDataAcasalamentoPorLinha] = useState<Record<string, string>>({});
  const [dataDiagnosticoPorLinha, setDataDiagnosticoPorLinha] = useState<Record<string, string>>({});

  const selecionadosLista = useMemo(
    () => participantes.filter((p) => selecionados.has(p.id)),
    [participantes, selecionados],
  );
  const podeConfirmarAcasalamento =
    selecionadosLista.length > 0 && selecionadosLista.every((p) => !p.confirmada);
  const podeRegistrarDiagnostico =
    selecionadosLista.length > 0 && selecionadosLista.every((p) => p.confirmada && !p.pariu);
  const selecaoMista =
    selecionadosLista.length > 0 && !podeConfirmarAcasalamento && !podeRegistrarDiagnostico;

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    setSelecionados((atual) => (atual.size === participantes.length ? new Set() : new Set(participantes.map((p) => p.id))));
  }

  async function remover(participanteId: string) {
    if (!confirm("Remover esta fêmea do evento?")) return;
    setRemovendoId(participanteId);
    try {
      await removerParticipante(localId, evento.id, participanteId);
      setSelecionados((atual) => {
        const novo = new Set(atual);
        novo.delete(participanteId);
        return novo;
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível remover.");
    } finally {
      setRemovendoId(null);
    }
  }

  async function confirmarLinha(participanteId: string, touroId: string) {
    setLinhaEmAndamento(participanteId);
    try {
      await confirmarAcasalamentos(localId, evento.id, {
        coberturaIds: [participanteId],
        touroId,
        rmLoteId: null,
        data: dataAcasalamentoPorLinha[participanteId] || hojeISO,
        responsavel: null,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  async function confirmarLinhaEmbriao(participanteId: string, loteEmbriaoId: string) {
    setLinhaEmAndamento(participanteId);
    try {
      await confirmarAcasalamentoEmbriao(localId, evento.id, {
        coberturaIds: [participanteId],
        loteEmbriaoId,
        data: dataAcasalamentoPorLinha[participanteId] || hojeISO,
        responsavel: null,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  async function desfazerLinha(participanteId: string) {
    if (!confirm("Desfazer este acasalamento e voltar pra pendente?")) return;
    setLinhaEmAndamento(participanteId);
    try {
      await desfazerAcasalamento(localId, evento.id, participanteId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível desfazer.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  async function marcarDiagnosticoLinha(
    participanteId: string,
    resultado: ResultadoDiagnostico,
    certeza: CertezaDiagnostico | null,
  ) {
    setLinhaEmAndamento(participanteId);
    try {
      await registrarDiagnosticosGestacao(localId, evento.id, {
        resultados: [{ coberturaId: participanteId, resultado, certeza }],
        data: dataDiagnosticoPorLinha[participanteId] || hojeISO,
        responsavel: null,
        observacoes: null,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={`/${localId}/reproducao/eventos?estacao=${evento.estacao_id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar aos eventos
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{evento.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {rotulosMetodo[evento.metodo]} — {evento.estacao_nome} — início em {formatarData(evento.data_inicio)}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border p-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {isTeFiv ? `Embriões transferidos: ${resumo.total}` : `Vacas acasaladas: ${resumo.total}`}
        </span>
        <span>
          Diagnosticadas: {resumo.diagnosticadas} ({formatarPercentual(resumo.diagnosticadas, resumo.total)})
        </span>
        <span>Prenhes: {resumo.prenhes}</span>
        <span>Vazias: {resumo.vazias}</span>
        <span>Inconclusivos: {resumo.inconclusivos}</span>
      </div>

      {podeEditar && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" onClick={() => setAdicionandoAberto(true)}>
            <Plus className="size-4" />
            {isTeFiv ? "Adicionar receptoras" : "Adicionar participantes"}
          </Button>
          {isIa && (
            <Button variant="outline" size="sm" onClick={() => setDosesRapidoAberto(true)}>
              <Plus className="size-4" />
              Adicionar doses de sêmen
            </Button>
          )}
        </div>
      )}

      {participantes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <p>Nenhuma fêmea participando deste evento ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {podeEditar && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selecionados.size > 0 && selecionados.size === participantes.length}
                      onCheckedChange={alternarTodos}
                    />
                  </TableHead>
                )}
                <TableHead>Fêmea</TableHead>
                <TableHead>{isTeFiv ? "Embrião" : "Acasalamento"}</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Data diagnóstico</TableHead>
                <TableHead>Diagnóstico</TableHead>
                {podeEditar && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantes.map((p) => {
                const podeEditarLinha = podeEditar && linhaEmAndamento !== p.id;
                const podeDesfazer = podeEditar && p.confirmada && !p.pariu && !p.ultimoDiagnosticoResultado;
                return (
                  <TableRow key={p.id} data-selecionado={selecionados.has(p.id) || undefined}>
                    {podeEditar && (
                      <TableCell>
                        <Checkbox checked={selecionados.has(p.id)} onCheckedChange={() => alternarSelecao(p.id)} />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{p.identificacao}</TableCell>
                    <TableCell>
                      {p.confirmada ? (
                        <div className="flex items-center gap-1">
                          <span>
                            {isTeFiv
                              ? p.touroNome
                                ? `${p.doadoraNome ?? "—"} × ${p.touroNome}`
                                : "—"
                              : (p.touroNome ?? p.rmLoteNome ?? "—")}
                          </span>
                          {podeDesfazer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-destructive"
                              title="Desfazer acasalamento"
                              disabled={linhaEmAndamento === p.id}
                              onClick={() => desfazerLinha(p.id)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : podeEditarLinha && isTeFiv ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {lotesEmbriao.length === 0 ? (
                            <Link
                              href={`/${localId}/reproducao/banco-genetico`}
                              className="text-sm text-muted-foreground underline"
                            >
                              Cadastrar lote de embriões
                            </Link>
                          ) : (
                            <Select
                              value=""
                              onValueChange={(loteId) => loteId && confirmarLinhaEmbriao(p.id, loteId)}
                              items={lotesEmbriao.map((l) => ({
                                value: l.id,
                                label: `${l.doadoraIdentificacao} × ${l.touroIdentificacao} (${l.quantidade})`,
                              }))}
                            >
                              <SelectTrigger className="h-8 w-56 text-sm">
                                <SelectValue placeholder="Lote de embriões..." />
                              </SelectTrigger>
                              <SelectContent>
                                {lotesEmbriao.map((l) => (
                                  <SelectItem key={l.id} value={l.id}>
                                    {l.doadoraIdentificacao} × {l.touroIdentificacao} ({l.quantidade})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Input
                            type="date"
                            className="h-8 w-32"
                            max={hojeISO}
                            value={dataAcasalamentoPorLinha[p.id] ?? hojeISO}
                            onChange={(e) =>
                              setDataAcasalamentoPorLinha((atual) => ({ ...atual, [p.id]: e.target.value }))
                            }
                          />
                        </div>
                      ) : podeEditarLinha ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <SeletorAnimalEvento
                            htmlId={`touro-${p.id}`}
                            rotulo="Touro"
                            compacto
                            sexo="macho"
                            especie={evento.especie}
                            candidatos={candidatos}
                            value=""
                            onValueChange={(touroId) => touroId && confirmarLinha(p.id, touroId)}
                          />
                          <Input
                            type="date"
                            className="h-8 w-32"
                            max={hojeISO}
                            value={dataAcasalamentoPorLinha[p.id] ?? hojeISO}
                            onChange={(e) =>
                              setDataAcasalamentoPorLinha((atual) => ({ ...atual, [p.id]: e.target.value }))
                            }
                          />
                        </div>
                      ) : (
                        "Pendente"
                      )}
                    </TableCell>
                    <TableCell>{formatarData(p.data)}</TableCell>
                    <TableCell>{formatarData(p.ultimoDiagnosticoData)}</TableCell>
                    <TableCell>
                      {p.pariu ? (
                        <Badge variant="secondary">Pariu</Badge>
                      ) : !p.confirmada ? (
                        <span className="text-muted-foreground">—</span>
                      ) : podeEditarLinha ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            {resultados.map((r) => (
                              <button
                                key={r.value}
                                type="button"
                                onClick={() =>
                                  marcarDiagnosticoLinha(
                                    p.id,
                                    r.value,
                                    r.value === "prenha" ? (p.ultimoDiagnosticoCerteza ?? "provavel") : null,
                                  )
                                }
                                className={cn(
                                  buttonVariants({
                                    variant: p.ultimoDiagnosticoResultado === r.value ? "secondary" : "outline",
                                    size: "xs",
                                  }),
                                )}
                              >
                                {r.rotulo}
                              </button>
                            ))}
                          </div>
                          {p.ultimoDiagnosticoResultado === "prenha" && (
                            <div className="flex flex-wrap gap-1">
                              {certezas.map((c) => (
                                <button
                                  key={c.value}
                                  type="button"
                                  onClick={() => marcarDiagnosticoLinha(p.id, "prenha", c.value)}
                                  className={cn(
                                    buttonVariants({
                                      variant: p.ultimoDiagnosticoCerteza === c.value ? "secondary" : "outline",
                                      size: "xs",
                                    }),
                                  )}
                                >
                                  {c.rotulo}
                                </button>
                              ))}
                            </div>
                          )}
                          <Input
                            type="date"
                            className="h-7 w-32 text-xs"
                            max={hojeISO}
                            placeholder="Hoje"
                            value={dataDiagnosticoPorLinha[p.id] ?? ""}
                            onChange={(e) =>
                              setDataDiagnosticoPorLinha((atual) => ({ ...atual, [p.id]: e.target.value }))
                            }
                          />
                        </div>
                      ) : p.ultimoDiagnosticoResultado ? (
                        <Badge variant={p.ultimoDiagnosticoResultado === "prenha" ? "secondary" : "outline"}>
                          {rotulosDiagnostico[p.ultimoDiagnosticoResultado]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {podeEditar && (
                      <TableCell>
                        {!p.confirmada && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            title="Remover"
                            disabled={removendoId === p.id}
                            onClick={() => remover(p.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {podeEditar && selecionadosLista.length > 0 && (
        <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3 shadow-lg">
          <span className="text-sm text-muted-foreground">{selecionadosLista.length} selecionada(s)</span>
          {selecaoMista && (
            <span className="text-sm text-muted-foreground">
              Selecione só fêmeas pendentes (pra acasalamento) ou só confirmadas sem diagnóstico (pra diagnóstico).
            </span>
          )}
          {podeConfirmarAcasalamento && (
            <Button
              size="sm"
              onClick={() => {
                const ids = selecionadosLista.map((p) => p.id);
                if (isTeFiv) setConfirmandoEmbriaoIds(ids);
                else setConfirmandoIds(ids);
              }}
            >
              Confirmar acasalamento ({selecionadosLista.length})
            </Button>
          )}
          {podeRegistrarDiagnostico && (
            <Button size="sm" onClick={() => setDiagnosticando(selecionadosLista)}>
              Registrar diagnóstico ({selecionadosLista.length})
            </Button>
          )}
        </div>
      )}

      {podeEditar && (
        <>
          <DialogoAdicionarParticipantes
            localId={localId}
            eventoId={evento.id}
            especie={evento.especie}
            candidatos={candidatos}
            jaParticipantes={jaParticipantes}
            aberto={adicionandoAberto}
            onFechar={() => setAdicionandoAberto(false)}
            titulo={isTeFiv ? "Adicionar receptoras ao evento" : "Adicionar fêmeas ao evento"}
            acao={isTeFiv ? adicionarReceptorasEvento : undefined}
          />
          <DialogoConfirmarAcasalamento
            localId={localId}
            eventoId={evento.id}
            especie={evento.especie}
            metodo={evento.metodo}
            candidatos={candidatos}
            lotesRm={lotesRm}
            coberturaIds={confirmandoIds}
            onFechar={() => {
              setConfirmandoIds(null);
              setSelecionados(new Set());
            }}
          />
          <DialogoConfirmarAcasalamentoEmbriao
            localId={localId}
            eventoId={evento.id}
            lotesEmbriao={lotesEmbriao}
            coberturaIds={confirmandoEmbriaoIds}
            onFechar={() => {
              setConfirmandoEmbriaoIds(null);
              setSelecionados(new Set());
            }}
          />
          <DialogoDiagnostico
            localId={localId}
            eventoId={evento.id}
            participantes={diagnosticando}
            onFechar={() => {
              setDiagnosticando(null);
              setSelecionados(new Set());
            }}
          />
          {isIa && (
            <DialogoAdicionarDosesSemen
              localId={localId}
              especie={evento.especie}
              candidatos={candidatos}
              aberto={dosesRapidoAberto}
              onFechar={() => setDosesRapidoAberto(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
