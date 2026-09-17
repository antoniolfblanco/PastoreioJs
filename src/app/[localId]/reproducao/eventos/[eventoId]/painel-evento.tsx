"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { removerParticipante } from "@/lib/actions/coberturas";
import { DialogoAdicionarParticipantes } from "./dialogo-adicionar-participantes";
import { DialogoAdicionarParticipantesEmbriao } from "./dialogo-adicionar-participantes-embriao";
import { DialogoConfirmarAcasalamento } from "./dialogo-confirmar-acasalamento";
import { DialogoDiagnostico } from "./dialogo-diagnostico";
import type { CandidatoAnimal, Evento, LoteEmbriaoOpcao, LoteRmOpcao, Participante } from "./page";

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
  const resumo = useMemo(() => resumoDeParticipantes(participantes), [participantes]);
  const jaParticipantes = useMemo(() => new Set(participantes.map((p) => p.femeaId)), [participantes]);

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [adicionandoAberto, setAdicionandoAberto] = useState(false);
  const [confirmandoIds, setConfirmandoIds] = useState<string[] | null>(null);
  const [diagnosticando, setDiagnosticando] = useState<Participante[] | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

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
              {participantes.map((p) => (
                <TableRow key={p.id} data-selecionado={selecionados.has(p.id) || undefined}>
                  {podeEditar && (
                    <TableCell>
                      <Checkbox checked={selecionados.has(p.id)} onCheckedChange={() => alternarSelecao(p.id)} />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{p.identificacao}</TableCell>
                  <TableCell>{p.touroNome ?? p.rmLoteNome ?? (p.confirmada ? "—" : "Pendente")}</TableCell>
                  <TableCell>{formatarData(p.data)}</TableCell>
                  <TableCell>{formatarData(p.ultimoDiagnosticoData)}</TableCell>
                  <TableCell>
                    {p.pariu ? (
                      <Badge variant="secondary">Pariu</Badge>
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
              ))}
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
            <Button size="sm" onClick={() => setConfirmandoIds(selecionadosLista.map((p) => p.id))}>
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
          {isTeFiv ? (
            <DialogoAdicionarParticipantesEmbriao
              localId={localId}
              eventoId={evento.id}
              especie={evento.especie}
              candidatos={candidatos}
              lotesEmbriao={lotesEmbriao}
              jaParticipantes={jaParticipantes}
              aberto={adicionandoAberto}
              onFechar={() => setAdicionandoAberto(false)}
            />
          ) : (
            <DialogoAdicionarParticipantes
              localId={localId}
              eventoId={evento.id}
              especie={evento.especie}
              candidatos={candidatos}
              jaParticipantes={jaParticipantes}
              aberto={adicionandoAberto}
              onFechar={() => setAdicionandoAberto(false)}
            />
          )}
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
          <DialogoDiagnostico
            localId={localId}
            eventoId={evento.id}
            participantes={diagnosticando}
            onFechar={() => {
              setDiagnosticando(null);
              setSelecionados(new Set());
            }}
          />
        </>
      )}
    </div>
  );
}
