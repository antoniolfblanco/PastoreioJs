"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { adicionarParticipantesEmbriao } from "@/lib/actions/coberturas";
import type { CandidatoAnimal, Especie, LoteEmbriaoOpcao } from "./page";

const hojeISO = new Date().toISOString().slice(0, 10);

function identificacao(a: CandidatoAnimal) {
  const base = [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
  return a.externo ? `${base} (externo)` : base;
}

export function DialogoAdicionarParticipantesEmbriao({
  localId,
  eventoId,
  especie,
  candidatos,
  lotesEmbriao,
  jaParticipantes,
  aberto,
  onFechar,
}: {
  localId: string;
  eventoId: string;
  especie: Especie;
  candidatos: CandidatoAnimal[];
  lotesEmbriao: LoteEmbriaoOpcao[];
  jaParticipantes: Set<string>;
  aberto: boolean;
  onFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(estaAberto) => !estaAberto && onFechar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar receptoras (TE/FIV)</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent — mesmo motivo já
            documentado nos outros diálogos deste evento. */}
        <ConteudoAdicionarParticipantesEmbriao
          key={aberto ? "aberto" : "fechado"}
          localId={localId}
          eventoId={eventoId}
          especie={especie}
          candidatos={candidatos}
          lotesEmbriao={lotesEmbriao}
          jaParticipantes={jaParticipantes}
          onFechar={onFechar}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConteudoAdicionarParticipantesEmbriao({
  localId,
  eventoId,
  especie,
  candidatos,
  lotesEmbriao,
  jaParticipantes,
  onFechar,
}: {
  localId: string;
  eventoId: string;
  especie: Especie;
  candidatos: CandidatoAnimal[];
  lotesEmbriao: LoteEmbriaoOpcao[];
  jaParticipantes: Set<string>;
  onFechar: () => void;
}) {
  const [loteId, setLoteId] = useState("");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [data, setData] = useState(hojeISO);
  const [responsavel, setResponsavel] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const lote = useMemo(() => lotesEmbriao.find((l) => l.id === loteId), [lotesEmbriao, loteId]);

  const disponiveis = useMemo(
    () => candidatos.filter((a) => a.sexo === "femea" && a.especie === especie && !jaParticipantes.has(a.id)),
    [candidatos, especie, jaParticipantes],
  );

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    if (!buscaMin) return disponiveis;
    return disponiveis.filter((a) =>
      [a.nome, a.brinco, a.tatuagem].filter(Boolean).some((t) => t!.toLowerCase().includes(buscaMin)),
    );
  }, [disponiveis, busca]);

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) {
        novo.delete(id);
      } else if (!lote || novo.size < lote.quantidade) {
        novo.add(id);
      }
      return novo;
    });
  }

  async function confirmar() {
    if (!loteId) {
      setErro("Selecione o lote de embriões.");
      return;
    }
    if (selecionados.size === 0) {
      setErro("Selecione ao menos uma receptora.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      await adicionarParticipantesEmbriao(localId, eventoId, {
        loteEmbriaoId: loteId,
        receptoraIds: Array.from(selecionados),
        data,
        responsavel: responsavel.trim() || null,
      });
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível adicionar.");
    } finally {
      setEmAndamento(false);
    }
  }

  if (lotesEmbriao.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum lote de embriões com quantidade disponível.{" "}
        <Link href={`/${localId}/reproducao/banco-genetico`} className="underline">
          Cadastrar lote de embriões
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Lote de embriões</Label>
        <div className="flex flex-col divide-y rounded-md border">
          {lotesEmbriao.map((l) => (
            <label key={l.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50">
              <input
                type="radio"
                name="loteEmbriao"
                checked={loteId === l.id}
                onChange={() => {
                  setLoteId(l.id);
                  setSelecionados(new Set());
                }}
              />
              <span className="flex-1">
                {l.doadoraIdentificacao} × {l.touroIdentificacao}
              </span>
              <Badge variant="outline">{l.quantidade} disponível(is)</Badge>
            </label>
          ))}
        </div>
      </div>

      {loteId && (
        <>
          <div className="flex flex-col gap-2">
            <Label>Receptoras</Label>
            <Input
              placeholder="Buscar por nome, brinco ou tatuagem..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {selecionados.size} de {lote?.quantidade ?? 0} selecionada(s)
            </p>
            <div className="h-64 overflow-y-auto rounded-md border">
              {dados.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhuma fêmea disponível encontrada.</p>
              ) : (
                <div className="flex flex-col divide-y">
                  {dados.map((a) => {
                    const marcada = selecionados.has(a.id);
                    const limiteAtingido = !marcada && lote !== undefined && selecionados.size >= lote.quantidade;
                    return (
                      <label
                        key={a.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm",
                          limiteAtingido ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/50",
                        )}
                      >
                        <Checkbox checked={marcada} disabled={limiteAtingido} onCheckedChange={() => alternar(a.id)} />
                        <span className="flex-1">{identificacao(a)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataEmbriao">Data</Label>
              <Input id="dataEmbriao" type="date" max={hojeISO} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsavelEmbriao">Responsável</Label>
              <Input id="responsavelEmbriao" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Link
          href={`/${localId}/reproducao/banco-genetico`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mr-auto")}
        >
          Cadastrar novo lote
        </Link>
        <Button type="button" disabled={emAndamento || !loteId || selecionados.size === 0} onClick={confirmar}>
          {emAndamento ? "Adicionando..." : `Adicionar (${selecionados.size})`}
        </Button>
      </DialogFooter>
    </div>
  );
}
